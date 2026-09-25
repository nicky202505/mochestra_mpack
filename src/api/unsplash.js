const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

const ENDPOINT = "https://api.unsplash.com/search/photos";

// Unsplash 가이드라인: 작가/Unsplash 링크에 utm 파라미터를 붙여야 함
const UTM = "utm_source=mochestra&utm_medium=referral";

// 한글 옷 이름 → 영어 검색어 (영어로 검색해야 결과가 정확함)
const TERMS = {
  민소매: "sleeveless top",
  반팔: "t-shirt",
  반바지: "shorts",
  "린넨 바지": "linen pants",
  "얇은 셔츠": "linen shirt",
  면바지: "chino pants",
  "얇은 가디건": "light cardigan",
  긴팔: "long sleeve shirt",
  청바지: "jeans",
  슬랙스: "slacks",
  "얇은 니트": "knit sweater",
  맨투맨: "sweatshirt",
  "기모 맨투맨": "fleece sweatshirt",
  가디건: "cardigan",
  자켓: "jacket",
  야상: "field jacket",
  트렌치코트: "trench coat",
  니트: "knitwear",
  "두꺼운 니트": "chunky knit sweater",
  코트: "wool coat",
  가죽자켓: "leather jacket",
  패딩: "puffer jacket",
  "두꺼운 코트": "winter coat",
  "기모 바지": "fleece pants",
  머플러: "muffler",
  목도리: "winter scarf",
  우산: "umbrella rain",
  레인부츠: "rain boots",
  장갑: "winter gloves",
  "방수 신발": "waterproof boots",
  마스크: "face mask street",
};

// 같은 검색어는 다시 요청하지 않고, 받아둔 사진 중에서 골라 보여줌
const cache = new Map();

function toQuery(items) {
  return `${items.map((item) => TERMS[item] ?? item).join(" ")} outfit`;
}

async function searchPhotos(query) {
  if (cache.has(query)) return cache.get(query);

  if (!ACCESS_KEY) {
    throw new Error("VITE_UNSPLASH_ACCESS_KEY가 설정되지 않았습니다 (.env 확인)");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("content_filter", "high");

  const request = fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Unsplash 요청 실패: ${res.status}`);
      const data = await res.json();
      return (data.results ?? []).map((photo) => ({
        id: photo.id,
        src: photo.urls.small,
        alt: photo.alt_description ?? query,
        author: photo.user.name,
        authorUrl: `${photo.user.links.html}?${UTM}`,
      }));
    })
    .catch((err) => {
      cache.delete(query); // 실패한 요청은 다음에 다시 시도
      throw err;
    });

  cache.set(query, request);
  return request;
}

// items: 옷 이름 배열. 조합 검색 결과가 없으면 뒤에서부터 하나씩 빼고 다시 검색
// (예: 자켓+맨투맨+청바지 → 자켓+맨투맨 → 자켓)
export async function fetchStylePhoto(items, excludeId) {
  let photos = [];
  for (let n = items.length; n > 0 && photos.length === 0; n--) {
    photos = await searchPhotos(toQuery(items.slice(0, n)));
  }
  if (photos.length === 0) throw new Error("사진을 찾지 못했어요");
  const candidates = photos.length > 1 ? photos.filter((p) => p.id !== excludeId) : photos;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const UNSPLASH_URL = `https://unsplash.com/?${UTM}`;
