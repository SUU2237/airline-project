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
let tokenRequestPromise: Promise<string | null> | null = null // 直接等待第一個請求的結果，不再重複發送換 Token 請求

// 自動取得 Access Token
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
  //確保同一時間只會有一支請求在換 Token
  tokenRequestPromise = (async () => {
    try {
      //依照 TDX 官方規範，打包格式
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', CLIENT_ID)
      params.append('client_secret', CLIENT_SECRET)

      const res = await authClient.post('', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      //保存 Token，並計算過期時間（故意提前 60 秒過期，預留緩衝）
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

//去拿機場/航班資料的 Client
const tdxClient: AxiosInstance = axios.create({
  baseURL: 'https://tdx.transportdata.tw/api/basic',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

//攔截器
tdxClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    //在 URL 補上 $format=JSON，指定用 JSON 格式包裝回傳
    config.params = {
      $format: 'JSON',
      ...config.params,
    }

    //自動去拿 Token，有拿到的話塞進 Header
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
