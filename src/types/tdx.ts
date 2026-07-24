// TDX API OData 查詢參數
export interface TdxQueryParams {
  $top?: number
  $skip?: number
  $filter?: string
  $orderBy?: string
  $format?: 'JSON' | 'XML'
}

// TDX 機場資料結構 (/v2/Air/Airport)
export interface TdxAirport {
  AirportID: string
  AirportCode?: string
  AirportIATA?: string
  AirportName: {
    Zh_tw?: string
    En?: string
  }
  AirportNationality?: string
}

// TDX 航空公司資料結構 (/v2/Air/Airline)
export interface TdxAirline {
  AirlineID: string
  AirlineIATA?: string
  AirlineICAO?: string
  AirlineName: {
    Zh_tw?: string
    En?: string
  }
}

// 🔥 預設熱門推薦機場清單
export const PRESET_AIRPORTS: TdxAirport[] = [
  {
    AirportID: 'TPE',
    AirportCode: 'TPE',
    AirportName: { Zh_tw: '臺灣桃園國際機場', En: 'Taiwan Taoyuan International Airport' },
  },
  {
    AirportID: 'TSA',
    AirportCode: 'TSA',
    AirportName: { Zh_tw: '臺北松山機場', En: 'Taipei Songshan Airport' },
  },
  {
    AirportID: 'KHH',
    AirportCode: 'KHH',
    AirportName: { Zh_tw: '高雄國際機場', En: 'Kaohsiung International Airport' },
  },
  {
    AirportID: 'NRT',
    AirportCode: 'NRT',
    AirportName: { Zh_tw: '東京成田國際機場', En: 'Narita International Airport' },
  },
  {
    AirportID: 'HND',
    AirportCode: 'HND',
    AirportName: { Zh_tw: '東京羽田國際機場', En: 'Tokyo Haneda Airport' },
  },
  {
    AirportID: 'KIX',
    AirportCode: 'KIX',
    AirportName: { Zh_tw: '大阪關西國際機場', En: 'Kansai International Airport' },
  },
  {
    AirportID: 'ICN',
    AirportCode: 'ICN',
    AirportName: { Zh_tw: '首爾仁川國際機場', En: 'Incheon International Airport' },
  },
]

// 🔥 預設常見航空公司清單
export const PRESET_AIRLINES: TdxAirline[] = [
  { AirlineID: 'CI', AirlineIATA: 'CI', AirlineName: { Zh_tw: '中華航空', En: 'China Airlines' } },
  { AirlineID: 'BR', AirlineIATA: 'BR', AirlineName: { Zh_tw: '長榮航空', En: 'EVA Air' } },
  {
    AirlineID: 'JX',
    AirlineIATA: 'JX',
    AirlineName: { Zh_tw: '星宇航空', En: 'STARLUX Airlines' },
  },
  { AirlineID: 'IT', AirlineIATA: 'IT', AirlineName: { Zh_tw: '台灣虎航', En: 'Tigerair Taiwan' } },
  { AirlineID: 'JL', AirlineIATA: 'JL', AirlineName: { Zh_tw: '日本航空', En: 'Japan Airlines' } },
  {
    AirlineID: 'NH',
    AirlineIATA: 'NH',
    AirlineName: { Zh_tw: '全日空', En: 'All Nippon Airways' },
  },
]
