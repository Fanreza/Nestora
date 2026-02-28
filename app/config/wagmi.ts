import { http, createConfig } from '@wagmi/core'
import { base } from 'viem/chains'
import { coinbaseWallet, injected } from '@wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'Nestora',
      preference: { options: 'smartWalletOnly' },
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})
