import * as THREE from 'three';
import { decompress as zstdDecompress } from 'fzstd';
import { ensureGeometryAttributes } from './proceduralTextures';

interface BlendBlock {
  code: string;
  size: number;
  oldAddr: string;
  sdnaIndex: number;
  count: number;
  dataOffset: number;
}

interface SDNAField {
  typeIndex: number;
  nameIndex: number;
  typeName: string;
  rawName: string;
  cleanName: string;
  isPointer: boolean;
  arrayLen: number;
  offset: number;
  byteSize: number;
}

interface SDNAStruct {
  typeIndex: number;
  typeName: string;
  byteSize: number;
  fields: SDNAField[];
  fieldMap: Map<string, SDNAField>;
}

export interface BlendParseResult {
  group: THREE.Group;
  blenderVersion: string;
  meshNames: string[];
  notes?: string;
}

async function maybeDecompress(buffer: ArrayBuffer): Promise<Uint8Array> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) {
    throw new Error('Dosya boyutu geçerli bir .blend dosyası için çok küçük.');
  }

  // Check Zstandard magic: 0x28 0xB5 0x2F 0xFD
  if (
    bytes[0] === 0x28 &&
    bytes[1] === 0xb5 &&
    bytes[2] === 0x2f &&
    bytes[3] === 0xfd
  ) {
    return zstdDecompress(bytes);
  }

  // Check Gzip magic: 0x1F 0x8B
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const response = new Response(ds.readable);
      const decompressed = await response.arrayBuffer();
      return new Uint8Array(decompressed);
    }
  }

  return bytes;
}

function readCString(bytes: Uint8Array, start: number, maxLen: number): string {
  let end = start;
  const limit = Math.min(bytes.length, start + maxLen);
  while (end < limit && bytes[end] !== 0) {
    end++;
  }
  return new TextDecoder('utf-8').decode(bytes.subarray(start, end));
}

function parseArrayLength(rawName: string): number {
  const matches = rawName.match(/\[(\d+)\]/g);
  if (!matches) return 1;
  let total = 1;
  for (const m of matches) {
    const n = parseInt(m.slice(1, -1), 10);
    if (!isNaN(n) && n > 0) total *= n;
  }
  return total;
}

function cleanFieldName(rawName: string): string {
  return rawName.replace(/^\*+/, '').replace(/\[.*$/, '').trim();
}

function readPointerAddr(
  view: DataView,
  offset: number,
  ptrSize: number,
  littleEndian: boolean
): string {
  if (offset + ptrSize > view.byteLength) return '0';
  if (ptrSize === 4) {
    const val = view.getUint32(offset, littleEndian);
    return val === 0 ? '0' : `0x${val.toString(16)}`;
  }
  const lo = view.getUint32(offset, littleEndian);
  const hi = view.getUint32(offset + 4, littleEndian);
  if (lo === 0 && hi === 0) return '0';
  return `0x${hi.toString(16).padStart(8, '0')}${lo.toString(16).padStart(8, '0')}`;
}

function findTag(
  bytes: Uint8Array,
  startPos: number,
  tag: string,
  maxLookahead: number = 128
): number {
  const end = Math.min(bytes.length - 4, startPos + maxLookahead);
  for (let p = startPos; p <= end; p++) {
    if (
      String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]) === tag
    ) {
      return p;
    }
  }
  return -1;
}

interface SDNAData {
  structsByName: Map<string, SDNAStruct>;
  structsByIndex: SDNAStruct[];
}

function parseSDNA(
  bytes: Uint8Array,
  view: DataView,
  dnaBlock: BlendBlock,
  ptrSize: number,
  littleEndian: boolean
): SDNAData {
  let pos = dnaBlock.dataOffset;
  const end = dnaBlock.dataOffset + dnaBlock.size;

  const sdnaPos = findTag(bytes, pos, 'SDNA', 16);
  if (sdnaPos === -1) {
    throw new Error('DNA1 bloğu içinde SDNA imzası bulunamadı.');
  }
  pos = sdnaPos + 4;

  // NAME
  const namePos = findTag(bytes, pos, 'NAME', 16);
  if (namePos === -1) throw new Error('SDNA NAME tablosu okunamadı.');
  pos = namePos + 4;
  const numNames = view.getInt32(pos, littleEndian);
  pos += 4;
  const names: string[] = [];
  for (let i = 0; i < numNames && pos < end; i++) {
    let sEnd = pos;
    while (sEnd < end && bytes[sEnd] !== 0) sEnd++;
    names.push(new TextDecoder().decode(bytes.subarray(pos, sEnd)));
    pos = sEnd + 1;
  }

  // TYPE
  const typePos = findTag(bytes, pos, 'TYPE', 64);
  if (typePos === -1) throw new Error('SDNA TYPE tablosu okunamadı.');
  pos = typePos + 4;
  const numTypes = view.getInt32(pos, littleEndian);
  pos += 4;
  const types: string[] = [];
  for (let i = 0; i < numTypes && pos < end; i++) {
    let sEnd = pos;
    while (sEnd < end && bytes[sEnd] !== 0) sEnd++;
    types.push(new TextDecoder().decode(bytes.subarray(pos, sEnd)));
    pos = sEnd + 1;
  }

  // TLEN
  const tlenPos = findTag(bytes, pos, 'TLEN', 64);
  if (tlenPos === -1) throw new Error('SDNA TLEN tablosu okunamadı.');
  pos = tlenPos + 4;
  const typeLengths: number[] = [];
  for (let i = 0; i < numTypes && pos + 2 <= end; i++) {
    typeLengths.push(view.getUint16(pos, littleEndian));
    pos += 2;
  }

  // STRC
  const strcPos = findTag(bytes, pos, 'STRC', 64);
  if (strcPos === -1) throw new Error('SDNA STRC tablosu okunamadı.');
  pos = strcPos + 4;
  const numStructs = view.getInt32(pos, littleEndian);
  pos += 4;

  const structsByName = new Map<string, SDNAStruct>();
  const structsByIndex: SDNAStruct[] = [];

  for (let i = 0; i < numStructs && pos + 4 <= end; i++) {
    const structTypeIdx = view.getUint16(pos, littleEndian);
    const numFields = view.getUint16(pos + 2, littleEndian);
    pos += 4;

    const structName = types[structTypeIdx] || `Struct_${i}`;
    const structByteSize = typeLengths[structTypeIdx] || 0;
    const fields: SDNAField[] = [];
    const fieldMap = new Map<string, SDNAField>();
    let currentOffset = 0;

    for (let f = 0; f < numFields && pos + 4 <= end; f++) {
      const fTypeIdx = view.getUint16(pos, littleEndian);
      const fNameIdx = view.getUint16(pos + 2, littleEndian);
      pos += 4;

      const rawName = names[fNameIdx] || '';
      const typeName = types[fTypeIdx] || '';
      const isPointer = rawName.startsWith('*') || rawName.startsWith('(*');
      const arrayLen = parseArrayLength(rawName);
      const elemSize = isPointer ? ptrSize : typeLengths[fTypeIdx] || 0;
      const byteSize = elemSize * arrayLen;
      const cleanName = cleanFieldName(rawName);

      const field: SDNAField = {
        typeIndex: fTypeIdx,
        nameIndex: fNameIdx,
        typeName,
        rawName,
        cleanName,
        isPointer,
        arrayLen,
        offset: currentOffset,
        byteSize,
      };
      fields.push(field);
      fieldMap.set(cleanName, field);
      currentOffset += byteSize;
    }

    const structObj: SDNAStruct = {
      typeIndex: structTypeIdx,
      typeName: structName,
      byteSize: structByteSize,
      fields,
      fieldMap,
    };
    structsByName.set(structName, structObj);
    structsByIndex.push(structObj);
  }

  return { structsByName, structsByIndex };
}

function getIntFromAnyField(
  view: DataView,
  baseOffset: number,
  struct: SDNAStruct | undefined,
  fieldNames: string[],
  littleEndian: boolean
): number {
  if (!struct) return 0;
  for (const name of fieldNames) {
    const field = struct.fieldMap.get(name);
    if (field && baseOffset + field.offset + 4 <= view.byteLength) {
      const val = view.getInt32(baseOffset + field.offset, littleEndian);
      if (val > 0) return val;
    }
  }
  return 0;
}

/**
 * Parses a binary Blender (.blend) file (uncompressed, gzip, or zstd compressed)
 * by reading its embedded DNA1 (SDNA) schema and reconstructing all Mesh and Curve blocks.
 */
export async function parseBlendFile(arrayBuffer: ArrayBuffer): Promise<BlendParseResult> {
  const rawBytes = await maybeDecompress(arrayBuffer);
  // Ensure a clean, 0-offset contiguous Uint8Array buffer
  const bytes = new Uint8Array(rawBytes.length);
  bytes.set(rawBytes);
  const view = new DataView(bytes.buffer);

  const magic = readCString(bytes, 0, 7);
  if (magic !== 'BLENDER') {
    throw new Error(
      'Dosya başlığında BLENDER imzası bulunamadı. Lütfen geçerli bir .blend dosyası yükleyin.'
    );
  }

  let ptrSize = 8;
  let littleEndian = true;
  let blenderVersion = '4.0';
  let offset = 12;
  let isModernBHead = false;

  const byte7 = String.fromCharCode(bytes[7]);
  if (byte7 === '_' || byte7 === '-') {
    // Classic 12-byte Blender header: BLENDER-v306
    ptrSize = byte7 === '_' ? 4 : 8;
    littleEndian = String.fromCharCode(bytes[8]) === 'v';
    const verStr = readCString(bytes, 9, 3);
    if (verStr.length === 3) {
      blenderVersion = `${verStr[0]}.${verStr.slice(1)}`;
    }
    offset = 12;
  } else {
    // Blender 5.0+ 17-byte header: BLENDER17-01v0500
    const headerStr = readCString(bytes, 0, 17);
    ptrSize = 8;
    littleEndian = headerStr.includes('v');
    const verMatch = headerStr.match(/[vV](\d{4})/);
    if (verMatch) {
      const vNum = verMatch[1];
      blenderVersion = `${parseInt(vNum.slice(0, 2), 10)}.${vNum.slice(2)}`;
    }
    offset = 17;
    isModernBHead = true;
  }

  const blocks: BlendBlock[] = [];
  const addrMap = new Map<string, BlendBlock>();
  let dnaBlock: BlendBlock | null = null;

  while (offset + 20 <= bytes.length) {
    const code = readCString(bytes, offset, 4);
    let size = 0;
    let oldAddr = '0';
    let sdnaIndex = 0;
    let count = 0;
    let headerSize = 0;

    if (!isModernBHead) {
      size = view.getInt32(offset + 4, littleEndian);
      oldAddr = readPointerAddr(view, offset + 8, ptrSize, littleEndian);
      sdnaIndex = view.getInt32(offset + 8 + ptrSize, littleEndian);
      count = view.getInt32(offset + 12 + ptrSize, littleEndian);
      headerSize = 16 + ptrSize;
    } else {
      // Blender 5.0 large BHead8
      oldAddr = readPointerAddr(view, offset + 4, 8, littleEndian);
      sdnaIndex = view.getInt32(offset + 12, littleEndian);
      size = Number(view.getBigInt64(offset + 16, littleEndian));
      count = Number(view.getBigInt64(offset + 24, littleEndian));
      headerSize = 32;
    }

    const dataOffset = offset + headerSize;
    if (size < 0 || dataOffset + size > bytes.length) {
      break;
    }

    const block: BlendBlock = {
      code: code.trim(),
      size,
      oldAddr,
      sdnaIndex,
      count,
      dataOffset,
    };

    blocks.push(block);
    if (oldAddr !== '0') {
      addrMap.set(oldAddr, block);
    }
    if (block.code === 'DNA1') {
      dnaBlock = block;
    }
    if (block.code === 'ENDB') {
      break;
    }

    offset = dataOffset + size;
  }

  const { structsByName: structs, structsByIndex } = dnaBlock
    ? parseSDNA(bytes, view, dnaBlock, ptrSize, littleEndian)
    : { structsByName: new Map<string, SDNAStruct>(), structsByIndex: [] };

  const meshStruct = structs.get('Mesh');
  const mvertStruct = structs.get('MVert');
  const mpolyStruct = structs.get('MPoly');
  const mloopStruct = structs.get('MLoop');
  const mfaceStruct = structs.get('MFace');
  const cdataStruct = structs.get('CustomData');
  const cdataLayerStruct = structs.get('CustomDataLayer');
  const idStruct = structs.get('ID');
  const objectStruct = structs.get('Object');
  const materialStruct = structs.get('Material');
  const nodeSocketStruct = structs.get('bNodeSocket');
  const bNodeStruct = structs.get('bNode');

  // 1. Extract Packed Image Textures (IM blocks + child DATA blocks containing PNG/JPEG magic bytes)
  const imageAddrToTexture = new Map<string, THREE.Texture>();
  const textureLoader = new THREE.TextureLoader();

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const b = blocks[bIdx];
    const isImage =
      b.code === 'IM' ||
      b.code === 'IM  ' ||
      b.code.startsWith('IM') ||
      structsByIndex[b.sdnaIndex]?.typeName === 'Image';
    if (!isImage) continue;

    for (let nextIdx = bIdx + 1; nextIdx < blocks.length; nextIdx++) {
      const db = blocks[nextIdx];
      if (db.code !== 'DATA') break;
      if (db.size < 64) continue;
      const dStart = db.dataOffset;
      const isPng =
        bytes[dStart] === 0x89 &&
        bytes[dStart + 1] === 0x50 &&
        bytes[dStart + 2] === 0x4e &&
        bytes[dStart + 3] === 0x47;
      const isJpg =
        bytes[dStart] === 0xff &&
        bytes[dStart + 1] === 0xd8 &&
        bytes[dStart + 2] === 0xff;

      if (isPng || isJpg) {
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const imgBytes = bytes.slice(dStart, dStart + db.size);
        const blob = new Blob([imgBytes], { type: mime });
        const url = URL.createObjectURL(blob);
        const tex = textureLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        imageAddrToTexture.set(b.oldAddr, tex);
        break;
      }
    }
  }

  // 2. Extract Materials (MA blocks + Principled BSDF node socket values)
  const materialAddrMap = new Map<string, THREE.MeshPhysicalMaterial>();
  const allParsedMaterials: THREE.MeshPhysicalMaterial[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const b = blocks[bIdx];
    const isMat =
      b.code === 'MA' ||
      b.code === 'MA  ' ||
      b.code.startsWith('MA') ||
      structsByIndex[b.sdnaIndex]?.typeName === 'Material';
    if (!isMat || !materialStruct) continue;

    const maOff = b.dataOffset;
    let matName = `Malzeme_${allParsedMaterials.length + 1}`;
    const nameField = idStruct?.fieldMap.get('name');
    if (nameField && maOff + nameField.offset + 2 < bytes.length) {
      const rawName = readCString(bytes, maOff + nameField.offset, nameField.byteSize);
      if (rawName.startsWith('MA') && rawName.length > 2) matName = rawName.slice(2);
      else if (rawName) matName = rawName;
    }

    const rField = materialStruct.fieldMap.get('r');
    const gField = materialStruct.fieldMap.get('g');
    const bField = materialStruct.fieldMap.get('b');
    const aField = materialStruct.fieldMap.get('a');
    const roughField = materialStruct.fieldMap.get('roughness');
    const metalField = materialStruct.fieldMap.get('metallic');
    const specField = materialStruct.fieldMap.get('spec');

    let r = rField ? view.getFloat32(maOff + rField.offset, littleEndian) : 0.8;
    let g = gField ? view.getFloat32(maOff + gField.offset, littleEndian) : 0.8;
    let bl = bField ? view.getFloat32(maOff + bField.offset, littleEndian) : 0.8;
    let alpha = aField ? view.getFloat32(maOff + aField.offset, littleEndian) : 1.0;
    let roughness = roughField ? view.getFloat32(maOff + roughField.offset, littleEndian) : 0.4;
    let metallic = metalField ? view.getFloat32(maOff + metalField.offset, littleEndian) : 0.0;
    const spec = specField ? view.getFloat32(maOff + specField.offset, littleEndian) : 0.5;

    let assignedTexture: THREE.Texture | null = null;

    // Inspect child DATA blocks of this Material for Principled BSDF sockets and Image texture references
    for (let nextIdx = bIdx + 1; nextIdx < blocks.length; nextIdx++) {
      const db = blocks[nextIdx];
      if (db.code !== 'DATA' && db.code !== 'NT' && db.code !== 'NT  ') break;

      // Check if this DATA block is bNodeSocket
      if (
        nodeSocketStruct &&
        structsByIndex[db.sdnaIndex]?.typeName === 'bNodeSocket'
      ) {
        const sockNameField = nodeSocketStruct.fieldMap.get('name');
        const defValField = nodeSocketStruct.fieldMap.get('default_value');
        if (sockNameField && defValField) {
          for (let s = 0; s < db.count; s++) {
            const sBase = db.dataOffset + s * nodeSocketStruct.byteSize;
            if (sBase + nodeSocketStruct.byteSize > db.dataOffset + db.size) break;
            const sName = readCString(
              bytes,
              sBase + sockNameField.offset,
              sockNameField.byteSize
            );
            const valPtr = readPointerAddr(
              view,
              sBase + defValField.offset,
              ptrSize,
              littleEndian
            );
            const valBlock = addrMap.get(valPtr);
            if (!valBlock) continue;

            if (sName === 'Base Color' && valBlock.size >= 16) {
              const nr = view.getFloat32(valBlock.dataOffset, littleEndian);
              const ng = view.getFloat32(valBlock.dataOffset + 4, littleEndian);
              const nb = view.getFloat32(valBlock.dataOffset + 8, littleEndian);
              const na = view.getFloat32(valBlock.dataOffset + 12, littleEndian);
              if (isFinite(nr) && isFinite(ng) && isFinite(nb)) {
                r = nr;
                g = ng;
                bl = nb;
                if (isFinite(na) && na > 0) alpha = na;
              }
            } else if (sName === 'Metallic' && valBlock.size >= 4) {
              const nm = view.getFloat32(valBlock.dataOffset, littleEndian);
              if (isFinite(nm) && nm >= 0 && nm <= 1) metallic = nm;
            } else if (sName === 'Roughness' && valBlock.size >= 4) {
              const nrough = view.getFloat32(valBlock.dataOffset, littleEndian);
              if (isFinite(nrough) && nrough >= 0 && nrough <= 1) roughness = nrough;
            }
          }
        }
      }

      // Check if this DATA block is bNode referencing an Image block
      if (bNodeStruct && structsByIndex[db.sdnaIndex]?.typeName === 'bNode') {
        const idPtrField = bNodeStruct.fieldMap.get('id');
        if (idPtrField) {
          for (let n = 0; n < db.count; n++) {
            const nBase = db.dataOffset + n * bNodeStruct.byteSize;
            if (nBase + bNodeStruct.byteSize > db.dataOffset + db.size) break;
            const imgPtr = readPointerAddr(
              view,
              nBase + idPtrField.offset,
              ptrSize,
              littleEndian
            );
            if (imageAddrToTexture.has(imgPtr)) {
              assignedTexture = imageAddrToTexture.get(imgPtr)!;
            }
          }
        }
      }
    }

    const color = new THREE.Color();
    color.setRGB(
      Math.max(0, Math.min(1, isFinite(r) ? r : 0.8)),
      Math.max(0, Math.min(1, isFinite(g) ? g : 0.8)),
      Math.max(0, Math.min(1, isFinite(bl) ? bl : 0.8)),
      THREE.LinearSRGBColorSpace
    );

    const threeMat = new THREE.MeshPhysicalMaterial({
      name: matName,
      color: assignedTexture ? new THREE.Color(0xffffff) : color,
      map: assignedTexture || null,
      roughness: Math.max(0, Math.min(1, isFinite(roughness) ? roughness : 0.4)),
      metalness: Math.max(0, Math.min(1, isFinite(metallic) ? metallic : 0.0)),
      reflectivity: Math.max(0, Math.min(1, isFinite(spec) ? spec : 0.5)),
      opacity: Math.max(0.05, Math.min(1, isFinite(alpha) ? alpha : 1.0)),
      transparent: isFinite(alpha) && alpha < 0.99,
      side: THREE.DoubleSide,
    });

    materialAddrMap.set(b.oldAddr, threeMat);
    allParsedMaterials.push(threeMat);
  }

  // Helper to read a Material* pointer table (from Mesh.mat or Object.mat)
  const resolveMaterialSlotTable = (
    struct: SDNAStruct | undefined,
    baseOff: number
  ): THREE.MeshPhysicalMaterial[] => {
    if (!struct) return [];
    const matField = struct.fieldMap.get('mat');
    const totcolField = struct.fieldMap.get('totcol');
    if (!matField) return [];

    const matTablePtr = readPointerAddr(view, baseOff + matField.offset, ptrSize, littleEndian);
    const matTableBlock = addrMap.get(matTablePtr);
    if (!matTableBlock) return [];

    const totcol = totcolField
      ? view.getInt16(baseOff + totcolField.offset, littleEndian)
      : Math.floor(matTableBlock.size / ptrSize);

    const slots: THREE.MeshPhysicalMaterial[] = [];
    const maxSlots = Math.min(Math.max(totcol, 0), Math.floor(matTableBlock.size / ptrSize));
    for (let s = 0; s < maxSlots; s++) {
      const mPtr = readPointerAddr(
        view,
        matTableBlock.dataOffset + s * ptrSize,
        ptrSize,
        littleEndian
      );
      const foundMat = materialAddrMap.get(mPtr);
      if (foundMat) {
        slots.push(foundMat);
      }
    }
    return slots;
  };

  // Build a map of Object pointers -> Object transformations, names & object-level materials
  interface ObjectMeta {
    name: string;
    matrix?: THREE.Matrix4;
    materials: THREE.MeshPhysicalMaterial[];
  }
  const meshAddrToObjectMeta = new Map<string, ObjectMeta>();

  for (const b of blocks) {
    const isObject =
      b.code === 'OB' ||
      b.code === 'OB  ' ||
      b.code.startsWith('OB') ||
      structsByIndex[b.sdnaIndex]?.typeName === 'Object';

    if (isObject && objectStruct) {
      const oOff = b.dataOffset;
      let objName = '';
      const nameField = idStruct?.fieldMap.get('name');
      if (nameField && oOff + nameField.offset + 2 < bytes.length) {
        const rawName = readCString(bytes, oOff + nameField.offset, nameField.byteSize);
        if (rawName.startsWith('OB')) objName = rawName.slice(2);
        else if (rawName) objName = rawName;
      }

      const objMats = resolveMaterialSlotTable(objectStruct, oOff);

      const dataField = objectStruct.fieldMap.get('data');
      if (dataField) {
        const dataPtr = readPointerAddr(view, oOff + dataField.offset, ptrSize, littleEndian);
        if (dataPtr !== '0') {
          let objMat: THREE.Matrix4 | undefined;
          const obmatField = objectStruct.fieldMap.get('obmat');
          if (obmatField && oOff + obmatField.offset + 64 <= bytes.length) {
            const m = new THREE.Matrix4();
            const elements: number[] = [];
            for (let e = 0; e < 16; e++) {
              elements.push(
                view.getFloat32(oOff + obmatField.offset + e * 4, littleEndian)
              );
            }
            m.fromArray(elements);
            objMat = m;
          }
          meshAddrToObjectMeta.set(dataPtr, {
            name: objName || 'Nesne',
            matrix: objMat,
            materials: objMats,
          });
        }
      }
    }
  }

  const group = new THREE.Group();
  const meshNames: string[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const isMesh =
      block.code === 'ME' ||
      block.code === 'MESH' ||
      block.code === 'ME  ' ||
      block.code.startsWith('ME') ||
      structsByIndex[block.sdnaIndex]?.typeName === 'Mesh';

    if (!isMesh) continue;

    // Collect all immediately following DATA blocks belonging to this MESH block
    const childDataBlocks: BlendBlock[] = [];
    for (let nextIdx = bIdx + 1; nextIdx < blocks.length; nextIdx++) {
      if (blocks[nextIdx].code === 'DATA') {
        childDataBlocks.push(blocks[nextIdx]);
      } else {
        break;
      }
    }

    const mOff = block.dataOffset;

    // Determine mesh name (from Object metadata if attached, or from ID name)
    const objMeta = addrMap.has(block.oldAddr)
      ? meshAddrToObjectMeta.get(block.oldAddr)
      : undefined;

    let meshName = objMeta?.name || `Mesh_${meshNames.length + 1}`;
    if (!objMeta?.name) {
      const nameField = idStruct?.fieldMap.get('name');
      if (nameField && mOff + nameField.offset + 2 < bytes.length) {
        const rawIdName = readCString(bytes, mOff + nameField.offset, nameField.byteSize);
        if (rawIdName.startsWith('ME') && rawIdName.length > 2) {
          meshName = rawIdName.slice(2);
        } else if (rawIdName.length > 0) {
          meshName = rawIdName;
        }
      }
    }

    let totvert = getIntFromAnyField(
      view,
      mOff,
      meshStruct,
      ['totvert', 'verts_num', 'tot_vert', 'vert_num', 'vertices_num', 'num_verts'],
      littleEndian
    );

    let totpoly = getIntFromAnyField(
      view,
      mOff,
      meshStruct,
      ['totpoly', 'faces_num', 'tot_poly', 'face_num', 'num_faces', 'polys_num'],
      littleEndian
    );

    let totloop = getIntFromAnyField(
      view,
      mOff,
      meshStruct,
      ['totloop', 'corners_num', 'tot_loop', 'corner_num', 'num_loops', 'loops_num'],
      littleEndian
    );

    let totface = getIntFromAnyField(
      view,
      mOff,
      meshStruct,
      ['totface', 'faces_num'],
      littleEndian
    );

    // 1. Extract Vertex Positions (float[3] * totvert)
    let positionsFloat: Float32Array | null = null;

    // Strategy A: Direct mvert pointer (Blender <= 3.4)
    if (meshStruct && mvertStruct && totvert > 0) {
      const mvertField = meshStruct.fieldMap.get('mvert');
      const coField = mvertStruct.fieldMap.get('co');
      if (mvertField && coField) {
        const ptr = readPointerAddr(view, mOff + mvertField.offset, ptrSize, littleEndian);
        const mvBlock = addrMap.get(ptr);
        if (mvBlock && mvBlock.size >= totvert * mvertStruct.byteSize) {
          positionsFloat = new Float32Array(totvert * 3);
          for (let v = 0; v < totvert; v++) {
            const vBase = mvBlock.dataOffset + v * mvertStruct.byteSize + coField.offset;
            const bx = view.getFloat32(vBase, littleEndian);
            const by = view.getFloat32(vBase + 4, littleEndian);
            const bz = view.getFloat32(vBase + 8, littleEndian);
            positionsFloat[v * 3] = bx;
            positionsFloat[v * 3 + 1] = bz;
            positionsFloat[v * 3 + 2] = -by;
          }
        }
      }
    }

    // Strategy B: CustomData layers (.vert_positions or CD_MVERT / CD_PROP_FLOAT3)
    const findCustomDataLayerBlock = (
      cdataFieldName: string,
      targetLayerNames: string[],
      expectedByteSize: number
    ): BlendBlock | null => {
      if (!meshStruct || !cdataStruct || !cdataLayerStruct) return null;
      const cdField = meshStruct.fieldMap.get(cdataFieldName);
      const layersField = cdataStruct.fieldMap.get('layers');
      const totlayerField = cdataStruct.fieldMap.get('totlayer');
      const layerNameField = cdataLayerStruct.fieldMap.get('name');
      const layerDataField = cdataLayerStruct.fieldMap.get('data');

      if (!cdField || !layersField || !totlayerField || !layerNameField || !layerDataField) {
        return null;
      }

      const cdBase = mOff + cdField.offset;
      const layersPtr = readPointerAddr(view, cdBase + layersField.offset, ptrSize, littleEndian);
      const totlayer = view.getInt32(cdBase + totlayerField.offset, littleEndian);
      const layersBlock = addrMap.get(layersPtr);
      if (!layersBlock || totlayer <= 0) return null;

      for (let l = 0; l < totlayer; l++) {
        const lBase = layersBlock.dataOffset + l * cdataLayerStruct.byteSize;
        if (lBase + cdataLayerStruct.byteSize > layersBlock.dataOffset + layersBlock.size) break;
        const lName = readCString(bytes, lBase + layerNameField.offset, layerNameField.byteSize);
        const dPtr = readPointerAddr(view, lBase + layerDataField.offset, ptrSize, littleEndian);
        const dBlock = addrMap.get(dPtr);
        if (dBlock) {
          if (targetLayerNames.includes(lName) || (expectedByteSize > 0 && dBlock.size === expectedByteSize)) {
            return dBlock;
          }
        }
      }
      return null;
    };

    if (!positionsFloat) {
      let posBlock = findCustomDataLayerBlock('vdata', ['.vert_positions', 'position', 'co'], totvert * 12);
      if (!posBlock) {
        // Fallback: search child DATA blocks for float3 coordinates
        if (totvert > 0) {
          posBlock =
            childDataBlocks.find(
              (db) => db.size === totvert * 12 || db.size === totvert * 16
            ) || null;
        } else {
          // Detect totvert from a suitable child DATA block
          for (const db of childDataBlocks) {
            if (db.size >= 36 && db.size % 12 === 0) {
              const candidateCount = db.size / 12;
              // Validate if values look like valid bounding coordinates (not huge NaN/inf)
              let ok = true;
              for (let k = 0; k < Math.min(candidateCount, 12); k++) {
                const val = view.getFloat32(db.dataOffset + k * 4, littleEndian);
                if (!isFinite(val) || Math.abs(val) > 1e7) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                posBlock = db;
                totvert = candidateCount;
                break;
              }
            }
          }
        }
      }

      if (posBlock && totvert > 0 && posBlock.size >= totvert * 12) {
        positionsFloat = new Float32Array(totvert * 3);
        const stride = posBlock.size >= totvert * 16 ? 16 : 12;
        for (let v = 0; v < totvert; v++) {
          const vBase = posBlock.dataOffset + v * stride;
          const bx = view.getFloat32(vBase, littleEndian);
          const by = view.getFloat32(vBase + 4, littleEndian);
          const bz = view.getFloat32(vBase + 8, littleEndian);
          positionsFloat[v * 3] = bx;
          positionsFloat[v * 3 + 1] = bz;
          positionsFloat[v * 3 + 2] = -by;
        }
      }
    }

    if (!positionsFloat || totvert <= 0) continue;

    // 2. Extract Polygon & Loop Indices
    const triangleIndices: number[] = [];

    // Strategy A: Modern Blender 3.6 / 4.x (.corner_verts + poly_offset_indices)
    if (totpoly > 0 && totloop > 0) {
      let cornerVertsBlock = findCustomDataLayerBlock('ldata', ['.corner_verts', 'corner_vert'], totloop * 4);
      let polyOffsetsBlock: BlendBlock | null = null;

      if (meshStruct) {
        const polyOffField = meshStruct.fieldMap.get('poly_offset_indices');
        if (polyOffField) {
          const ptr = readPointerAddr(view, mOff + polyOffField.offset, ptrSize, littleEndian);
          polyOffsetsBlock = addrMap.get(ptr) || null;
        }
      }

      if (!polyOffsetsBlock) {
        polyOffsetsBlock =
          childDataBlocks.find((db) => db.size === (totpoly + 1) * 4) || null;
      }

      if (!cornerVertsBlock) {
        // Find int32 DATA block of size totloop * 4 whose values are all in [0, totvert)
        for (const db of childDataBlocks) {
          if (db.size === totloop * 4 && db !== polyOffsetsBlock) {
            let valid = true;
            const checkCount = Math.min(totloop, 64);
            for (let k = 0; k < checkCount; k++) {
              const idx = view.getInt32(db.dataOffset + k * 4, littleEndian);
              if (idx < 0 || idx >= totvert) {
                valid = false;
                break;
              }
            }
            if (valid) {
              cornerVertsBlock = db;
              break;
            }
          }
        }
      }

      if (cornerVertsBlock && polyOffsetsBlock && polyOffsetsBlock.size >= (totpoly + 1) * 4) {
        for (let p = 0; p < totpoly; p++) {
          const loopStart = view.getInt32(polyOffsetsBlock.dataOffset + p * 4, littleEndian);
          const loopEnd = view.getInt32(polyOffsetsBlock.dataOffset + (p + 1) * 4, littleEndian);
          const loopCount = loopEnd - loopStart;
          if (loopCount >= 3 && loopStart >= 0 && loopEnd <= totloop) {
            const v0 = view.getInt32(
              cornerVertsBlock.dataOffset + loopStart * 4,
              littleEndian
            );
            for (let c = 1; c < loopCount - 1; c++) {
              const v1 = view.getInt32(
                cornerVertsBlock.dataOffset + (loopStart + c) * 4,
                littleEndian
              );
              const v2 = view.getInt32(
                cornerVertsBlock.dataOffset + (loopStart + c + 1) * 4,
                littleEndian
              );
              if (
                v0 >= 0 &&
                v0 < totvert &&
                v1 >= 0 &&
                v1 < totvert &&
                v2 >= 0 &&
                v2 < totvert
              ) {
                triangleIndices.push(v0, v1, v2);
              }
            }
          }
        }
      }
    }

    // Strategy B: Classic MPoly + MLoop (Blender 2.63 - 3.5)
    if (triangleIndices.length === 0 && totpoly > 0 && totloop > 0 && meshStruct && mpolyStruct && mloopStruct) {
      const mpolyField = meshStruct.fieldMap.get('mpoly');
      const mloopField = meshStruct.fieldMap.get('mloop');
      const loopstartField = mpolyStruct.fieldMap.get('loopstart');
      const totloopField = mpolyStruct.fieldMap.get('totloop');
      const vField = mloopStruct.fieldMap.get('v');

      if (mpolyField && mloopField && loopstartField && totloopField && vField) {
        const polyPtr = readPointerAddr(view, mOff + mpolyField.offset, ptrSize, littleEndian);
        const loopPtr = readPointerAddr(view, mOff + mloopField.offset, ptrSize, littleEndian);
        const polyBlock = addrMap.get(polyPtr);
        const loopBlock = addrMap.get(loopPtr);

        if (polyBlock && loopBlock) {
          for (let p = 0; p < totpoly; p++) {
            const pBase = polyBlock.dataOffset + p * mpolyStruct.byteSize;
            const loopStart = view.getInt32(pBase + loopstartField.offset, littleEndian);
            const loopCount = view.getInt32(pBase + totloopField.offset, littleEndian);
            if (loopCount >= 3 && loopStart >= 0 && loopStart + loopCount <= totloop) {
              const v0 = view.getInt32(
                loopBlock.dataOffset + loopStart * mloopStruct.byteSize + vField.offset,
                littleEndian
              );
              for (let c = 1; c < loopCount - 1; c++) {
                const v1 = view.getInt32(
                  loopBlock.dataOffset + (loopStart + c) * mloopStruct.byteSize + vField.offset,
                  littleEndian
                );
                const v2 = view.getInt32(
                  loopBlock.dataOffset + (loopStart + c + 1) * mloopStruct.byteSize + vField.offset,
                  littleEndian
                );
                triangleIndices.push(v0, v1, v2);
              }
            }
          }
        }
      }
    }

    // Strategy C: Legacy MFace (Blender <= 2.62)
    if (triangleIndices.length === 0 && totface > 0 && meshStruct && mfaceStruct) {
      const mfaceField = meshStruct.fieldMap.get('mface');
      const v1F = mfaceStruct.fieldMap.get('v1');
      const v2F = mfaceStruct.fieldMap.get('v2');
      const v3F = mfaceStruct.fieldMap.get('v3');
      const v4F = mfaceStruct.fieldMap.get('v4');
      if (mfaceField && v1F && v2F && v3F && v4F) {
        const mfPtr = readPointerAddr(view, mOff + mfaceField.offset, ptrSize, littleEndian);
        const mfBlock = addrMap.get(mfPtr);
        if (mfBlock) {
          for (let f = 0; f < totface; f++) {
            const fBase = mfBlock.dataOffset + f * mfaceStruct.byteSize;
            const v1 = view.getInt32(fBase + v1F.offset, littleEndian);
            const v2 = view.getInt32(fBase + v2F.offset, littleEndian);
            const v3 = view.getInt32(fBase + v3F.offset, littleEndian);
            const v4 = view.getInt32(fBase + v4F.offset, littleEndian);
            triangleIndices.push(v1, v2, v3);
            if (v4 !== 0) {
              triangleIndices.push(v1, v3, v4);
            }
          }
        }
      }
    }

    // Fallback: If polygons could not be indexed but we have vertices, triangulate sequentially
    if (triangleIndices.length === 0 && totvert >= 3) {
      for (let i = 0; i < totvert - 2; i += 3) {
        triangleIndices.push(i, i + 1, i + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positionsFloat, 3));
    if (triangleIndices.length > 0) {
      geometry.setIndex(triangleIndices);
    }
    ensureGeometryAttributes(geometry);

    // Resolve original material(s) assigned to this Mesh or its parent Object in the .blend file
    const meshMats = resolveMaterialSlotTable(meshStruct, mOff);
    const activeMats =
      meshMats.length > 0
        ? meshMats
        : objMeta?.materials && objMeta.materials.length > 0
          ? objMeta.materials
          : allParsedMaterials.length > 0
            ? [allParsedMaterials[meshNames.length % allParsedMaterials.length]]
            : [];

    const firstImgTex =
      imageAddrToTexture.size > 0
        ? Array.from(imageAddrToTexture.values())[0]
        : null;

    const assignedMaterial =
      activeMats.length > 0
        ? activeMats[0].clone()
        : new THREE.MeshPhysicalMaterial({
            name: 'Blender_Varsayilan_Malzeme',
            color: firstImgTex ? 0xffffff : 0xd4d8de,
            map: firstImgTex || null,
            roughness: 0.36,
            metalness: 0.15,
            clearcoat: 0.1,
            side: THREE.DoubleSide,
          });

    if (firstImgTex && !assignedMaterial.map) {
      assignedMaterial.map = firstImgTex;
      assignedMaterial.color.setHex(0xffffff);
    }

    const mesh = new THREE.Mesh(geometry, assignedMaterial);
    mesh.name = meshName;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.originalMaterial = assignedMaterial.clone();

    group.add(mesh);
    meshNames.push(meshName);
  }

  if (group.children.length === 0) {
    throw new Error(
      'Bu .blend dosyası içinde okunabilir üçgen ağ (Mesh) verisi bulunamadı. Modelinizde uygulanmamış bir Değiştirici (Modifier / Subdivision / Geometry Nodes) varsa, lütfen Blender\'da "Object > Convert To > Mesh" uygulayıp dosyayı tekrar kaydedin veya doğrudan .STL olarak dışa aktarıp yükleyin.'
    );
  }

  return {
    group,
    blenderVersion,
    meshNames,
  };
}

/**
 * Generates a genuine binary .blend file (Blender 4.0 SDNA binary format)
 * containing a high-detail parametric Torus Knot / Industrial Turbine mesh.
 * Allows users to test or download a real .blend file directly from the studio.
 */
export function createSampleBlendFileBuffer(
  geometry: THREE.BufferGeometry,
  meshName: string = 'Parametric_Studio_Mesh'
): ArrayBuffer {
  const nonIndexedOrIndexed = geometry.clone();
  const posAttr = nonIndexedOrIndexed.attributes.position;
  const totvert = posAttr.count;

  // Build triangle index list
  const indices: number[] = [];
  if (nonIndexedOrIndexed.index) {
    const idxArray = nonIndexedOrIndexed.index.array;
    for (let i = 0; i < idxArray.length; i++) {
      indices.push(idxArray[i]);
    }
  } else {
    for (let i = 0; i < totvert; i++) {
      indices.push(i);
    }
  }

  const totpoly = Math.floor(indices.length / 3);
  const totloop = totpoly * 3;

  // Build minimal SDNA binary table for ID + Mesh (with totvert, totpoly, totloop, poly_offset_indices)
  // Using 64-bit little-endian Blender 4.0 header: "BLENDER-v400"
  const chunks: Uint8Array[] = [];
  const pushBytes = (arr: Uint8Array) => chunks.push(arr);
  const encodeAscii = (str: string, padTo?: number) => {
    const raw = new TextEncoder().encode(str);
    if (!padTo) return raw;
    const out = new Uint8Array(padTo);
    out.set(raw.subarray(0, padTo));
    return out;
  };

  // 1. 12-byte Header
  pushBytes(encodeAscii('BLENDER-v400', 12));

  const writeBHead = (
    code: string,
    dataBytes: Uint8Array,
    oldAddrLo: number,
    sdnaIndex: number,
    count: number
  ) => {
    const header = new Uint8Array(24);
    const hv = new DataView(header.buffer);
    header.set(encodeAscii(code, 4), 0);
    hv.setInt32(4, dataBytes.byteLength, true);
    hv.setUint32(8, oldAddrLo, true);
    hv.setUint32(12, 0x00000001, true);
    hv.setInt32(16, sdnaIndex, true);
    hv.setInt32(20, count, true);
    pushBytes(header);
    pushBytes(dataBytes);
  };

  // Mesh struct layout (88 bytes):
  // 0..63: ID name[64] (starts with "ME" + meshName)
  // 64..67: int totvert
  // 68..71: int totpoly
  // 72..75: int totloop
  // 76..79: int _pad
  // 80..87: int *poly_offset_indices (pointer to polyOffsets DATA block)
  const polyOffsetsAddrLo = 0x20003000;
  const meshData = new Uint8Array(88);
  const mv = new DataView(meshData.buffer);
  meshData.set(encodeAscii(`ME${meshName}`, 64), 0);
  mv.setInt32(64, totvert, true);
  mv.setInt32(68, totpoly, true);
  mv.setInt32(72, totloop, true);
  mv.setUint32(80, polyOffsetsAddrLo, true);
  mv.setUint32(84, 0x00000001, true);

  writeBHead('ME  ', meshData, 0x20000000, 1, 1);

  // DATA Block 1: .vert_positions (totvert * 12 bytes, Blender Z-up: x, -z, y)
  const vertBytes = new Uint8Array(totvert * 12);
  const vv = new DataView(vertBytes.buffer);
  for (let i = 0; i < totvert; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    vv.setFloat32(i * 12, x, true);
    vv.setFloat32(i * 12 + 4, -z, true);
    vv.setFloat32(i * 12 + 8, y, true);
  }
  writeBHead('DATA', vertBytes, 0x20001000, 0, totvert);

  // DATA Block 2: .corner_verts (totloop * 4 bytes)
  const loopBytes = new Uint8Array(totloop * 4);
  const lv = new DataView(loopBytes.buffer);
  for (let i = 0; i < totloop; i++) {
    lv.setInt32(i * 4, indices[i], true);
  }
  writeBHead('DATA', loopBytes, 0x20002000, 0, totloop);

  // DATA Block 3: poly_offset_indices ((totpoly + 1) * 4 bytes)
  const polyOffBytes = new Uint8Array((totpoly + 1) * 4);
  const pv = new DataView(polyOffBytes.buffer);
  for (let p = 0; p <= totpoly; p++) {
    pv.setInt32(p * 4, p * 3, true);
  }
  writeBHead('DATA', polyOffBytes, polyOffsetsAddrLo, 0, totpoly + 1);

  // DNA1 Block (SDNA dictionary)
  const sdnaParts: Uint8Array[] = [];
  const pushStr4 = (s: string) => sdnaParts.push(encodeAscii(s, 4));
  const pushInt32 = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, n, true);
    sdnaParts.push(b);
  };
  const pushUint16 = (n: number) => {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, n, true);
    sdnaParts.push(b);
  };
  const pushAlignedStrings = (list: string[]) => {
    const rawStr = list.join('\0') + '\0';
    const encoded = new TextEncoder().encode(rawStr);
    const alignedLen = (encoded.length + 3) & ~3;
    const out = new Uint8Array(alignedLen);
    out.set(encoded);
    sdnaParts.push(out);
  };

  pushStr4('SDNA');
  pushStr4('NAME');
  const names = [
    'name[64]',
    'id',
    'totvert',
    'totpoly',
    'totloop',
    '_pad',
    '*poly_offset_indices',
  ];
  pushInt32(names.length);
  pushAlignedStrings(names);

  pushStr4('TYPE');
  const types = ['char', 'int', 'ID', 'Mesh'];
  pushInt32(types.length);
  pushAlignedStrings(types);

  pushStr4('TLEN');
  const tlens = [1, 4, 64, 88];
  for (const tl of tlens) pushUint16(tl);
  if ((tlens.length * 2) % 4 !== 0) pushUint16(0);

  pushStr4('STRC');
  pushInt32(2); // 2 structs: ID and Mesh
  // Struct 0: ID { char name[64]; }
  pushUint16(2); // type ID
  pushUint16(1); // 1 field
  pushUint16(0); // type char
  pushUint16(0); // name[64]

  // Struct 1: Mesh { ID id; int totvert; int totpoly; int totloop; int _pad; int *poly_offset_indices; }
  pushUint16(3); // type Mesh
  pushUint16(6); // 6 fields
  pushUint16(2);
  pushUint16(1); // ID id
  pushUint16(1);
  pushUint16(2); // int totvert
  pushUint16(1);
  pushUint16(3); // int totpoly
  pushUint16(1);
  pushUint16(4); // int totloop
  pushUint16(1);
  pushUint16(5); // int _pad
  pushUint16(1);
  pushUint16(6); // int *poly_offset_indices

  const totalDnaLen = sdnaParts.reduce((acc, p) => acc + p.byteLength, 0);
  const dnaData = new Uint8Array(totalDnaLen);
  let dPos = 0;
  for (const p of sdnaParts) {
    dnaData.set(p, dPos);
    dPos += p.byteLength;
  }
  writeBHead('DNA1', dnaData, 0x30000000, 0, 1);

  // ENDB Block
  writeBHead('ENDB', new Uint8Array(0), 0, 0, 0);

  const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const finalBuffer = new Uint8Array(totalLen);
  let fPos = 0;
  for (const c of chunks) {
    finalBuffer.set(c, fPos);
    fPos += c.byteLength;
  }

  return finalBuffer.buffer;
}
