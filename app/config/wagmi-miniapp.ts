import { createConfig, http } from '@wagmi/core'
import { base } from 'viem/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { baseAccount } from '@wagmi/connectors'

export const miniAppWagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
    baseAccount({
      appName: 'Nestora',
      appLogoUrl: 'https://nestora.aethereal.top/icon.png',
    }),
  ],
})
