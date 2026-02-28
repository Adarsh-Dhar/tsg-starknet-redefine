#[starknet::interface]
pub trait IGravityVault<TContractState> {
    fn deposit(ref self: TContractState, amount: u256);
    fn slash(ref self: TContractState, user: starknet::ContractAddress, amount: u256);
    fn reclaim(ref self: TContractState, amount: u256);
    fn get_balance(self: @TContractState, account: starknet::ContractAddress) -> u256;
}

#[starknet::contract]
mod GravityVault {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, 
        StorageMapReadAccess, StorageMapWriteAccess, Map
    };
    
    // CRITICAL: This exact path matches the OpenZeppelin registry package
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        delegate: ContractAddress,
        balances: Map<ContractAddress, u256>,
        token_address: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, 
        delegate_addr: ContractAddress, // The Server's address
        token: ContractAddress          // STRK or ETH token address
    ) {
        self.delegate.write(delegate_addr);
        self.token_address.write(token);
    }

    #[abi(embed_v0)]
    impl GravityVaultImpl of super::IGravityVault<ContractState> {

        fn deposit(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let token = IERC20Dispatcher { contract_address: self.token_address.read() };
            
            // Transfer tokens from the user to the vault
            token.transfer_from(caller, get_contract_address(), amount);
            
            let current_bal = self.balances.read(caller);
            self.balances.write(caller, current_bal + amount);
        }

        fn slash(ref self: ContractState, user: ContractAddress, amount: u256) {
            // Only the authorized delegate (the server) can slash
            assert(get_caller_address() == self.delegate.read(), 'NOT_AUTHORIZED_DELEGATE');
            
            let user_bal = self.balances.read(user);
            assert(user_bal >= amount, 'INSUFFICIENT_FUNDS');
            
            // Update internal balance
            self.balances.write(user, user_bal - amount);
            
            // Transfer slashed tokens to the delegate
            let token = IERC20Dispatcher { contract_address: self.token_address.read() };
            token.transfer(self.delegate.read(), amount);
        }

        fn reclaim(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let user_bal = self.balances.read(caller);
            
            assert(amount > 0, 'NO_FUNDS_TO_RECLAIM');
            assert(user_bal >= amount, 'INSUFFICIENT_FUNDS');
            
            // Update internal balance
            self.balances.write(caller, user_bal - amount);
            
            // Return tokens to the user
            let token = IERC20Dispatcher { contract_address: self.token_address.read() };
            token.transfer(caller, amount);
        }

        fn get_balance(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }
    }
}