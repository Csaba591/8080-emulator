import { readFileSync } from "node:fs";

import { disassemble, parseInstruction } from "./disassembler.js";
import {
  toHexString,
  flagCarry,
  writeMemory,
  flagZ,
  flagS,
  DAD,
  concat,
  split,
  uint8,
  parity,
  logicFlagsA,
} from "./utils.js";

function readVRAM(state) {
  const vram = state.memory.slice(0x2400, 0x2410);
  vram[0] !== undefined && console.log(vram[0]);
}

function printInstr(pc, state, instruction) {
  let args = " ---- ";
  if (instruction.args.length === 2)
    args = toHexString(concat(instruction.args[1], instruction.args[0]));
  else if (instruction.args.length === 1)
    args = toHexString(instruction.args[0]);

  let msg = `${toHexString(pc)} ${instruction.instruction} ${args}\t${
    state.conditionCodes.z
  }\t[${state.a} ${state.b} ${state.c} ${state.d} ${state.e} ${state.h} ${
    state.l
  }]`;

  console.log(msg);
}

let instructionCount = 0;

function emulate8080op(state) {
  const pcCopy = state.pc;
  const instruction = parseInstruction(state);
  printInstr(pcCopy, state, instruction);

  if (instructionCount++ >= 1546) {
    if (true) {
      instructionCount = instructionCount;
    }
    // debugger;
  }
  let isJump = false;

  switch (instruction.instruction) {
    case "NOP":
      break;
    case "JMP adr":
      {
        isJump = true;
        const [byte1, byte2] = instruction.args;
        const address = concat(byte2, byte1);
        state.pc = address;
      }
      break;
    case "JNZ adr":
      {
        if (state.conditionCodes.z === 0) {
          isJump = true;
          const [byte1, byte2] = instruction.args;
          const address = concat(byte2, byte1);
          state.pc = address;
        }
      }
      break;
    case "CALL adr":
      {
        isJump = true;
        const returnAddress = state.pc + 1;
        console.log("return address", toHexString(returnAddress));
        writeMemory(state, state.stackPointer - 1, (returnAddress >> 8) & 0xff);
        writeMemory(state, state.stackPointer - 2, returnAddress & 0xff);
        state.stackPointer -= 2;
        const [byte1, byte2] = instruction.args;
        const address = concat(byte2, byte1);
        state.pc = address;
      }
      break;
    case "LXI B,D16":
      {
        const [byte1, byte2] = instruction.args;
        state.b = byte2;
        state.c = byte1;
      }
      break;
    case "LXI D,D16":
      {
        const [byte1, byte2] = instruction.args;
        state.d = byte2;
        state.e = byte1;
      }
      break;
    case "LXI H,D16":
      {
        const [byte1, byte2] = instruction.args;
        state.h = byte2;
        state.l = byte1;
      }
      break;
    case "LXI SP,D16":
      {
        const [byte1, byte2] = instruction.args;
        state.stackPointer = concat(byte2, byte1);
      }
      break;
    case "DCR B": // complete?
      {
        state.b = state.b - 1;
        state.conditionCodes.z = flagZ(state.b);
        state.conditionCodes.s = flagS(state.b);
        state.conditionCodes.p = parity(state.b, 8);
      }
      break;
    case "DCR C":
      {
        state.c = state.c - 1;
        state.conditionCodes.z = flagZ(state.c);
        state.conditionCodes.s = flagS(state.c);
        state.conditionCodes.p = parity(state.c, 8);
      }
      break;
    case "DAD B":
      {
        const res = DAD(state.h, state.l, state.b, state.c);
        [state.h, state.l] = split(res);
        state.conditionCodes.cy = (res & 0xffff0000) > 0 ? 1 : 0;
      }
      break;
    case "DAD D":
      {
        const res = DAD(state.h, state.l, state.d, state.e);
        [state.h, state.l] = split(res);
        state.conditionCodes.cy = (res & 0xffff0000) > 0 ? 1 : 0;
      }
      break;
    case "DAD H":
      {
        const res = DAD(state.h, state.l, state.h, state.l);
        [state.h, state.l] = split(res);
        state.conditionCodes.cy = (res & 0xffff0000) > 0 ? 1 : 0;
      }
      break;
    case "MVI C, D8":
      {
        state.c = instruction.args[0];
      }
      break;
    case "MVI B, D8":
      {
        state.b = instruction.args[0];
      }
      break;
    case "MVI H, D8":
      {
        state.h = instruction.args[0];
      }
      break;
    case "MVI M, D8":
      {
        const address = concat(state.h, state.l);
        writeMemory(state, address, byte1);
      }
      break;
    case "MVI A, D8":
      {
        state.a = instruction.args[0];
      }
      break;
    case "RRC":
      {
        const x = state.a;
        state.a = ((x & 1) << 7) | (x >> 1);
        state.conditionCodes.cy = x & 1;
      }
      break;
    case "INX D":
      {
        const de = concat(state.d, state.e);
        const res = de + 1;
        [state.d, state.e] = split(res);
      }
      break;
    case "INX H":
      {
        const hl = concat(state.h, state.l);
        const res = hl + 1;
        [state.h, state.l] = split(res);
      }
      break;
    case "LDAX D":
      {
        const address = concat(state.d, state.e);
        state.a = state.memory[address];
      }
      break;
    case "STA adr":
      {
        const [byte1, byte2] = instruction.args;
        const address = concat(byte2, byte1);
        writeMemory(state, address, state.a);
      }
      break;
    case "LDA adr":
      {
        const [byte1, byte2] = instruction.args;
        const address = concat(byte2, byte1);
        state.a = state.memory[address];
      }
      break;
    case "MOV D,M":
      {
        const address = concat(state.h, state.l);
        state.d = state.memory[address];
      }
      break;
    case "MOV E,M":
      {
        const address = concat(state.h, state.l);
        state.e = state.memory[address];
      }
      break;
    case "MOV H,M":
      {
        const address = concat(state.h, state.l);
        state.h = state.memory[address];
      }
      break;
    case "MOV A,M":
      {
        const address = concat(state.h, state.l);
        state.a = state.memory[address];
      }
      break;
    case "MOV M,A":
      {
        const address = concat(state.h, state.l);
        writeMemory(state, address, state.a);
      }
      break;
    case "MOV L,A":
      {
        state.l = state.a;
      }
      break;
    case "MOV A,D":
      {
        state.a = state.d;
      }
      break;
    case "MOV A,E":
      {
        state.a = state.e;
      }
      break;
    case "MOV A,H":
      {
        state.a = state.h;
      }
      break;
    case "ANA A":
      {
        state.a = state.a & state.a;
        logicFlagsA(state);
      }
      break;
    case "XRA A":
      {
        state.a = state.a ^ state.a;
        logicFlagsA(state);
      }
      break;
    case "POP B":
      {
        state.c = state.memory[state.stackPointer];
        state.b = state.memory[state.stackPointer + 1];
        state.stackPointer += 2;
      }
      break;
    case "POP D":
      {
        state.e = state.memory[state.stackPointer];
        state.d = state.memory[state.stackPointer + 1];
        state.stackPointer += 2;
      }
      break;
    case "POP H":
      {
        state.l = state.memory[state.stackPointer];
        state.h = state.memory[state.stackPointer + 1];
        state.stackPointer += 2;
      }
      break;
    case "PUSH B":
      {
        writeMemory(state, state.stackPointer - 2, state.c);
        writeMemory(state, state.stackPointer - 1, state.b);
        state.stackPointer -= 2;
      }
      break;
    case "PUSH D":
      {
        writeMemory(state, state.stackPointer - 2, state.e);
        writeMemory(state, state.stackPointer - 1, state.d);
        state.stackPointer -= 2;
      }
      break;
    case "PUSH H":
      {
        writeMemory(state, state.stackPointer - 2, state.l);
        writeMemory(state, state.stackPointer - 1, state.h);
        state.stackPointer -= 2;
      }
      break;
    case "ADI D8":
      {
        const x = state.a + instruction.args[0];
        state.a = x;
        // TODO: P
        state.conditionCodes.cy = x > 0xff ? 1 : 0;
        state.conditionCodes.z = (x & 0xff) == 0 ? 1 : 0;
        state.conditionCodes.s = flagS(state.a);
        state.conditionCodes.p = parity(x & 0xff, 8);
      }
      break;
    case "ANI D8":
      {
        state.a = state.a & instruction.args[0];
        logicFlagsA(state);
      }
      break;
    case "RET":
      {
        isJump = true;
        const address = concat(
          state.memory[state.stackPointer + 1] << 8, // TODO: this is not the same as is set in the CALL
          state.memory[state.stackPointer]
        );
        state.pc = address;
        state.stackPointer += 2;
      }
      break;
    case "OUT D8":
      {
        // talks to external hw, not implemented for now
      }
      break;
    case "XCHG":
      {
        const h = state.h;
        const l = state.l;
        state.h = state.d;
        state.l = state.e;
        state.d = h;
        state.e = l;
      }
      break;
    case "POP PSW":
      {
        state.a = state.memory[state.stackPointer + 1];
        const psw = state.memory[state.stackPointer];
        state.conditionCodes.z = (psw & 0x01) === 0x01 ? 1 : 0;
        state.conditionCodes.s = (psw & 0x02) === 0x02 ? 1 : 0;
        state.conditionCodes.p = (psw & 0x04) === 0x04 ? 1 : 0;
        state.conditionCodes.cy = (psw & 0x05) === 0x05 ? 1 : 0;
        state.conditionCodes.ac = (psw & 0x10) === 0x10 ? 1 : 0;
        state.stackPointer += 2;
      }
      break;
    case "PUSH PSW":
      {
        writeMemory(state, state.stackPointer - 1, state.a);

        const psw =
          state.conditionCodes.z |
          (state.conditionCodes.s << 1) |
          (state.conditionCodes.p << 2) |
          (state.conditionCodes.cy << 3) |
          (state.conditionCodes.ac << 4);
        writeMemory(state, state.stackPointer - 2, psw);

        state.stackPointer -= 2;
      }
      break;
    case "EI":
      {
        state.interruptEnabled = 1;
      }
      break;
    case "CPI D8":
      {
        const res = uint8(state.a - instruction.args[0]);
        // TODO: P
        state.conditionCodes.z = flagZ(res);
        state.conditionCodes.s = flagS(res);
        state.conditionCodes.cy = state.a < instruction.args[0];
        state.conditionCodes.p = parity(res, 8);
      }
      break;
    default:
      console.log(`unimplemented: ${instruction.instruction}!`);
      // throw 1;
      break;
  }

  if (!isJump) ++state.pc;
}

const rom = readFileSync("./space_invaders/invaders");

const state = {
  registers: new Uint8Array(7),
  a: 0,
  b: 0,
  c: 0,
  d: 0,
  e: 0,
  h: 0,
  l: 0,
  interruptEnabled: 1,
  _stackPointer: 0,
  pc: 0,
  memory: new Uint8Array(),
  conditionCodes: {
    z: 0,
    s: 0,
    p: 0,
    cy: 0,
    ac: 0,
  },
};

const REGISTER_MAP = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  h: 5,
  l: 6,
};

for (const [register, index] of Object.entries(REGISTER_MAP)) {
  Object.defineProperty(state, register, {
    get() {
      return state.registers[REGISTER_MAP[register]];
    },
    set(value) {
      state.registers[REGISTER_MAP[register]] = value;
    },
  });
}

Object.defineProperty(state, "stackPointer", {
  get() {
    return state._stackPointer;
  },
  set(value) {
    state._stackPointer = value;
  },
});

const MEMORY_SIZE = 0x10000; // 16K
state.memory = new Uint8Array(MEMORY_SIZE);
state.memory.set(rom);
// Stack grows downwards, so it should start at the end of the memory (https://retrocomputing.stackexchange.com/a/14504)
state.stackPointer = state.memory[state.memory.length - 1];

while (true) {
  try {
    emulate8080op(state);
    // readVRAM(state);

    if (state.pc >= rom.length) {
      console.log("Ran out of rom program", state.pc);
      throw 1;
    }
  } catch (err) {
    console.error(err);
    console.log(state);
    break;
  }
}
