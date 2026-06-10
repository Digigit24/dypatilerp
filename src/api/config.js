export const USE_MOCK = false
export const BASE_URL =
  import.meta.env.PROD
    ? 'https://dyperf.celiyo.com/api'
    : 'http://localhost:5000/api'
