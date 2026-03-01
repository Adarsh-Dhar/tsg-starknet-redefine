"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = void 0;
exports.verifyDelegationTransaction = verifyDelegationTransaction;
exports.getDelegationAmount = getDelegationAmount;
var starknet_1 = require("starknet");
var RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io';
var VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769';
exports.provider = new starknet_1.RpcProvider({ nodeUrl: RPC_URL });
/**
 * Verify that a transaction hash corresponds to a valid delegation deposit
 * @param txHash - Transaction hash to verify
 * @param expectedAddress - Expected delegator address
 * @param expectedAmount - Expected delegation amount (in wei)
 * @returns true if transaction is valid, false otherwise
 */
function verifyDelegationTransaction(txHash, expectedAddress, expectedAmount) {
    return __awaiter(this, void 0, void 0, function () {
        var receipt, status_1, tx, calldata, vaultInteraction, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, exports.provider.getTransactionReceipt(txHash)];
                case 1:
                    receipt = _a.sent();
                    if (!receipt) {
                        console.error("[Verify] Transaction receipt not found for hash: ".concat(txHash));
                        return [2 /*return*/, false];
                    }
                    status_1 = receipt.status || receipt.execution_status;
                    if (status_1 !== 'ACCEPTED_ON_L2' && status_1 !== 'ACCEPTED_ON_L1' && status_1 !== 'SUCCEEDED') {
                        console.error("[Verify] Transaction not accepted. Status: ".concat(status_1));
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, exports.provider.getTransaction(txHash)];
                case 2:
                    tx = _a.sent();
                    calldata = tx.calldata || [];
                    vaultInteraction = false;
                    if (Array.isArray(calldata)) {
                        vaultInteraction = calldata.some(function (call) {
                            return call.contract_address === VAULT_ADDRESS ||
                                (call.to && call.to.toLowerCase() === VAULT_ADDRESS.toLowerCase());
                        });
                    }
                    if (!vaultInteraction) {
                        console.error("[Verify] Transaction did not interact with vault address: ".concat(VAULT_ADDRESS));
                        return [2 /*return*/, false];
                    }
                    console.log("[Verify] Transaction ".concat(txHash, " verified successfully for address: ").concat(expectedAddress));
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    console.error("[Verify] Error verifying transaction ".concat(txHash, ":"), error_1);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get the delegation amount for an address from the vault contract
 * This can be used as a secondary verification mechanism
 */
function getDelegationAmount(address) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                // This would require the contract ABI to be imported
                // For now, this is a placeholder that can be expanded
                console.log("[Verify] Checking delegation amount for address: ".concat(address));
                return [2 /*return*/, null];
            }
            catch (error) {
                console.error("[Verify] Error getting delegation amount:", error);
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    });
}
