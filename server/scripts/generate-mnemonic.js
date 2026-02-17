const Mnemonic = require('bitcore-mnemonic');

const code = new Mnemonic(Mnemonic.Words.ENGLISH);
console.log("=== BACKEND SEED (SAVE TO .ENV) ===");
console.log(code.toString());
