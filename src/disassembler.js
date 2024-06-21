import { toHexString } from "./utils.js";
import OPCODE_MAP from "./opcode-map.js";

export function parseInstruction(state) {
  const opcode = state.memory[state.pc];
  const translated = OPCODE_MAP[opcode];

  if (!translated) return;

  const instruction = { instruction: translated.instruction };

  const numArgs = translated.len - 1;
  const args = [];
  for (let i = 0; i < numArgs; ++i) {
    state.pc += 1;
    const arg = state.memory[state.pc];
    args.push(arg);
  }

  instruction.args = args;
  instruction.token = toHexString(opcode);
  return instruction;
}

export function disassemble(binaryProgram) {
  const codeIter = binaryProgram.values();

  const program = [];

  while (true) {
    try {
      program.push(parseInstruction(codeIter));
    } catch (err) {
      // console.log(err);
      break;
    }
  }

  return program;
}
