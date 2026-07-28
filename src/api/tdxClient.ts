//伺服器連線、驗證token發送與基礎 Header 設定

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

const authClient = axios.create({
  baseURL: 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
})

const CLIENT_ID = import.meta.env.VITE_TDX_CLIENT_ID || ''
const CLIENT_SECRET = import.meta.env.VITE_TDX_CLIENT_SECRET || ''

let accessToken: string | null = null
let tokenExpiresAt = 0
let tokenRequestPromise: Promise<string | null> | null = null // 防鎖：單例請求 Promise

// 自動取得 Access Token (帶併發防護鎖)
async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return null
  }

  // 避免同時間發送多次 Token 請求觸發 429 限速
  if (tokenRequestPromise) {
    return tokenRequestPromise
  }

  tokenRequestPromise = (async () => {
    try {
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', CLIENT_ID)
      params.append('client_secret', CLIENT_SECRET)

      const res = await authClient.post('', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      accessToken = res.data.access_token
      tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000
      return accessToken
    } catch (err) {
      console.warn('[TDX Auth Warning]: 無法取得 Token，退回匿名模式', err)
      return null
    } finally {
      tokenRequestPromise = null
    }
  })()

  return tokenRequestPromise
}

const tdxClient: AxiosInstance = axios.create({
  baseURL: 'https://tdx.transportdata.tw/api/basic',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

tdxClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.params = {
      $format: 'JSON',
      ...config.params,
    }

    const token = await getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: unknown) => Promise.reject(error),
)

tdxClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: unknown) => Promise.reject(error),
)

export default tdxClient
