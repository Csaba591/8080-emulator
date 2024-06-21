export function toHexString(x) {
  return x.toString(16).padStart(2, "0");
}

export function flagCarry(result) {
  const x = (result & 0xffff0000) > 0 ? 1 : 0;
  if (x) {
    debugger;
  }
  return x;
}

export function flagZ(result) {
  return result === 0 ? 1 : 0;
}

export function flagS(result) {
  return (result & 0x80) == 0x80 ? 1 : 0;
}

export function concat(byte1, byte2) {
  // mask out last 8 bits to make sure values are 8 bit ints
  const b1 = byte1 & 0xff;
  const b2 = byte2 & 0xff;
  return (b1 << 8) | b2;
}

export function split(block) {
  return [(block >> 8) & 0xff, block & 0xff];
}

export function DAD(a, b, c, d) {
  const ab = concat(a, b);
  const cd = concat(c, d);
  return ab + cd;
}

export function uint8(value) {
  return new Uint8Array([value])[0];
}

export function logicFlagsA(state) {
  // TODO: P
  state.conditionCodes.cy = 0;
  state.conditionCodes.ac = 0;
  state.conditionCodes.z = state.a === 0 ? 1 : 0;
  state.conditionCodes.s = 0x80 === (state.a & 0x80) ? 1 : 0;
  state.conditionCodes.p = parity(state.a, 8);
}

export function parity(x, size) {
  let i;
  let p = 0;
  x = x & ((1 << size) - 1);
  for (i = 0; i < size; i++) {
    if (x & 0x1) p++;
    x = x >> 1;
  }
  return 0 == (p & 0x1) ? 1 : 0;
}

export function writeMemory(state, address, value) {
  if (address > state.memory.length - 1)
    throw new Error(
      `address ${address} points outside of memory of ${state.memory.length}`
    );
  console.log("writememory");
  // const m = state.memory[address];
  // if (m !== undefined) {
  //   debugger;
  // }
  state.memory[address] = value;
}
