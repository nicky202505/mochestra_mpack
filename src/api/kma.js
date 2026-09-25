const SERVICE_KEY = import.meta.env.VITE_KMA_SERVICE_KEY;

const ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
// 단기예보: 하루 최저(TMN)/최고(TMX) 기온을 얻기 위해 사용
const DAILY_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

// 기상청 격자(nx, ny) 변환 (기상청 제공 DFS_XY_LCC 알고리즘)
function toGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = (30.0 * Math.PI) / 180.0;
  const SLAT2 = (60.0 * Math.PI) / 180.0;
  const OLON = (126.0 * Math.PI) / 180.0;
  const OLAT = (38.0 * Math.PI) / 180.0;
  const XO = 43;
  const YO = 136;

  const re = RE / GRID;
  let sn =
    Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) /
    Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  sn = Math.log(Math.cos(SLAT1) / Math.cos(SLAT2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(SLAT1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + OLAT * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const raLat = (lat * Math.PI) / 180.0;
  let ra = Math.tan(Math.PI * 0.25 + raLat * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = (lon * Math.PI) / 180.0 - OLON;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

// 초단기예보는 매시 30분에 생성되어 45분부터 제공됨
function getBaseDateTime() {
  const now = new Date();
  let hour = now.getHours();
  const baseDate = new Date(now);

  if (now.getMinutes() < 45) {
    hour -= 1;
  }
  if (hour < 0) {
    hour = 23;
    baseDate.setDate(baseDate.getDate() - 1);
  }

  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, "0");
  const d = String(baseDate.getDate()).padStart(2, "0");

  return {
    baseDate: `${y}${m}${d}`,
    baseTime: `${String(hour).padStart(2, "0")}30`,
  };
}

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// 오늘 전체(최저·최고 포함)가 담긴 단기예보는 02시 발표분 (02:10 이후 제공).
// 그 전이면 어제 23시 발표분을 사용 (다음날 전체를 포함함)
function getDailyBaseDateTime() {
  const now = new Date();
  if (now.getHours() > 2 || (now.getHours() === 2 && now.getMinutes() >= 10)) {
    return { baseDate: formatYmd(now), baseTime: "0200" };
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return { baseDate: formatYmd(yesterday), baseTime: "2300" };
}

// 기상청 체감온도 공식
// - 여름(5~9월): 기온+습도 (습구온도 이용). 선선한 날(20°C 미만)엔 오히려
//   더 덥게 계산되어 옷을 얇게 추천하게 되므로 20°C 이상일 때만 적용
// - 겨울: 기온 10°C 이하, 풍속 4.8km/h 이상일 때 바람 반영
export function feelsLike(temp, humidity, windMs, month = new Date().getMonth() + 1) {
  if (temp == null) return null;

  if (month >= 5 && month <= 9 && temp >= 20 && humidity != null) {
    const rh = humidity;
    const tw =
      temp * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
      Math.atan(temp + rh) -
      Math.atan(rh - 1.67633) +
      0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
      4.686035;
    return (
      -0.2442 + 0.55399 * tw + 0.45535 * temp - 0.0022 * tw * tw + 0.00278 * tw * temp + 3.0
    );
  }

  const windKmh = (windMs ?? 0) * 3.6;
  if (temp <= 10 && windKmh >= 4.8) {
    const v = Math.pow(windKmh, 0.16);
    return 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * v * temp;
  }
  return temp;
}

function deriveCondition(sky, pty) {
  if (pty !== "0") {
    return pty === "3" || pty === "7" ? "눈" : "비";
  }
  return sky === "1" ? "맑음" : "흐림";
}

async function requestForecast(endpoint, { nx, ny, baseDate, baseTime }) {
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", nx);
  url.searchParams.set("ny", ny);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`기상청 API 요청 실패: ${res.status}`);
  }

  const data = await res.json();
  const header = data?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(`기상청 API 오류: ${header?.resultMsg ?? "알 수 없는 오류"}`);
  }

  const items = data?.response?.body?.items?.item ?? [];
  if (items.length === 0) {
    throw new Error("기상청 API 응답에 예보 데이터가 없습니다");
  }
  return items;
}

// 오늘 최저/최고 기온. TMN/TMX가 없으면 오늘 시간별 기온(TMP)에서 계산
async function fetchDailyRange(grid) {
  const items = await requestForecast(DAILY_ENDPOINT, { ...grid, ...getDailyBaseDateTime() });
  const today = items.filter((item) => item.fcstDate === formatYmd(new Date()));
  const pick = (category) => today.find((item) => item.category === category)?.fcstValue;
  const hourly = today.filter((item) => item.category === "TMP").map((item) => Number(item.fcstValue));

  const tmn = pick("TMN");
  const tmx = pick("TMX");
  return {
    min: tmn !== undefined ? Number(tmn) : hourly.length ? Math.min(...hourly) : null,
    max: tmx !== undefined ? Number(tmx) : hourly.length ? Math.max(...hourly) : null,
  };
}

export async function fetchTodayWeather({ lat, lon, locationName }) {
  if (!SERVICE_KEY) {
    throw new Error("VITE_KMA_SERVICE_KEY가 설정되지 않았습니다 (.env 확인)");
  }

  const grid = toGrid(lat, lon);

  // 최저/최고 기온은 부가 정보라 실패해도 현재 날씨는 그대로 보여줌
  const [items, range] = await Promise.all([
    requestForecast(ENDPOINT, { ...grid, ...getBaseDateTime() }),
    fetchDailyRange(grid).catch((err) => {
      console.warn("최저/최고 기온 조회 실패:", err.message);
      return { min: null, max: null };
    }),
  ]);

  const [firstDate, firstTime] = [items[0].fcstDate, items[0].fcstTime];
  const nearest = items.filter(
    (item) => item.fcstDate === firstDate && item.fcstTime === firstTime,
  );

  const values = Object.fromEntries(
    nearest.map((item) => [item.category, item.fcstValue]),
  );

  const toNumber = (v) => (v !== undefined ? Number(v) : null);
  const temperature = toNumber(values.T1H);
  const humidity = toNumber(values.REH);
  const windSpeed = toNumber(values.WSD);
  const apparent = feelsLike(temperature, humidity, windSpeed);
  // 최저/최고는 새벽 예보값이라 실제 현재 기온이 범위를 벗어날 수 있음 → 현재 기온까지 포함
  const clamp = (value, pickFn) =>
    value == null ? null : temperature == null ? value : pickFn(value, temperature);

  return {
    location: locationName ?? "알 수 없음",
    temperature,
    condition: deriveCondition(values.SKY, values.PTY),
    humidity,
    windSpeed,
    feelsLike: apparent != null ? Math.round(apparent * 10) / 10 : null,
    minTemp: clamp(range.min, Math.min),
    maxTemp: clamp(range.max, Math.max),
  };
}
