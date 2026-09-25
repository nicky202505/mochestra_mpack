// 공공데이터포털 키는 기상청과 같은 키를 사용
// (포털에서 "한국환경공단_에어코리아_대기오염정보" 활용신청 필요)
const SERVICE_KEY = import.meta.env.VITE_KMA_SERVICE_KEY;

const ENDPOINT =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

// 환경부 예보 등급 기준 (µg/m³ 상한)
const GRADES = {
  pm10: [30, 80, 150],
  pm25: [15, 35, 75],
};
const GRADE_NAMES = ["좋음", "보통", "나쁨", "매우나쁨"];

export function dustGrade(type, value) {
  if (value == null) return null;
  const index = GRADES[type].findIndex((limit) => value <= limit);
  return GRADE_NAMES[index === -1 ? GRADE_NAMES.length - 1 : index];
}

function average(values) {
  const valid = values.map(Number).filter((v) => Number.isFinite(v));
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

// 시·도의 측정소 값 중, 같은 구 이름의 측정소가 있으면 그 값을, 없으면 시·도 평균을 사용
export async function fetchAirQuality({ sidoName, district }) {
  if (!SERVICE_KEY) {
    throw new Error("VITE_KMA_SERVICE_KEY가 설정되지 않았습니다 (.env 확인)");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("numOfRows", "200");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("sidoName", sidoName);
  url.searchParams.set("ver", "1.0");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`에어코리아 API 요청 실패: ${res.status}`);
  }

  const data = await res.json();
  const header = data?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(`에어코리아 API 오류: ${header?.resultMsg ?? "알 수 없는 오류"}`);
  }

  const items = data?.response?.body?.items ?? [];
  if (items.length === 0) {
    throw new Error("에어코리아 응답에 측정 데이터가 없습니다");
  }

  const station = district && items.find((item) => item.stationName === district);
  const source = station ? [station] : items;
  const pm10 = average(source.map((item) => item.pm10Value));
  const pm25 = average(source.map((item) => item.pm25Value));

  return {
    pm10,
    pm25,
    pm10Grade: dustGrade("pm10", pm10),
    pm25Grade: dustGrade("pm25", pm25),
    station: station ? station.stationName : `${sidoName} 평균`,
  };
}
