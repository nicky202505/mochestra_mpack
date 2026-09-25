const API_KEY = import.meta.env.VITE_KWEATHER_API_KEY;

// TODO: 케이웨더 마이페이지에서 실제 신청한 상품(날씨정보/초단기예보/동네예보 등)의
// 엔드포인트 URL로 교체. 발급받은 API 가이드 문서의 요청 파라미터명도 함께 맞춰줄 것.
const ENDPOINT = "https://api.kweather.co.kr/todo-endpoint";

export async function fetchTodayWeather({ lat, lon }) {
  if (!API_KEY) {
    throw new Error("VITE_KWEATHER_API_KEY가 설정되지 않았습니다 (.env 확인)");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`케이웨더 API 요청 실패: ${res.status}`);
  }

  const data = await res.json();

  // TODO: 실제 응답 필드명에 맞춰 매핑 수정
  return {
    location: data.location ?? "알 수 없음",
    temperature: data.temperature ?? null,
    condition: data.condition ?? "-",
  };
}
