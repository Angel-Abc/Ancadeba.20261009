export interface Resolver<S> {
  resolve<K extends keyof S>(key: K): S[K]
}

export type Factories<S> = {
  [K in keyof S]: (resolver: Resolver<S>) => S[K]
}
