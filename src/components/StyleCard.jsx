import { useRef, useState } from "react";
import "./Card.css";
import "./StyleCard.css";
import { fetchStylePhoto, UNSPLASH_URL } from "../api/unsplash";

// 기온별 부위별 옷 후보 (높은 기온부터 순서대로 비교). 겉옷이 필요 없는 날은 빈 배열
const OUTFITS_BY_TEMP = [
  { min: 28, outer: [], top: ["민소매", "반팔"], bottom: ["반바지", "린넨 바지"] },
  { min: 23, outer: [], top: ["반팔", "얇은 셔츠"], bottom: ["반바지", "면바지"] },
  { min: 20, outer: ["얇은 가디건"], top: ["긴팔", "얇은 셔츠"], bottom: ["면바지", "청바지"] },
  { min: 17, outer: ["가디건", "얇은 가디건"], top: ["얇은 니트", "맨투맨"], bottom: ["청바지", "면바지"] },
  { min: 12, outer: ["자켓", "가디건", "야상"], top: ["맨투맨", "니트"], bottom: ["청바지", "면바지"] },
  { min: 9, outer: ["트렌치코트", "야상", "자켓"], top: ["니트", "맨투맨"], bottom: ["청바지", "슬랙스"] },
  { min: 5, outer: ["코트", "가죽자켓"], top: ["니트", "기모 맨투맨"], bottom: ["청바지", "슬랙스"], extras: ["머플러"] },
  { min: -Infinity, outer: ["패딩", "두꺼운 코트"], top: ["두꺼운 니트", "기모 맨투맨"], bottom: ["기모 바지", "청바지"], extras: ["목도리"] },
];

const EXTRAS_BY_CONDITION = {
  비: ["우산", "레인부츠"],
  눈: ["장갑", "방수 신발"],
};

const PARTS = [
  { key: "outer", label: "겉옷" },
  { key: "top", label: "상의" },
  { key: "bottom", label: "하의" },
];

function formatDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 부위마다 0~1 사이 난수를 하나씩 두고, 그걸로 후보 중 하나를 고름
function randomPicks() {
  return { outer: Math.random(), top: Math.random(), bottom: Math.random() };
}

// 일교차가 이 이상이면 겉옷을 챙기도록 안내
const BIG_RANGE = 10;
// 체감온도가 기온과 이만큼 이상 차이 나면 안내
const FEELS_GAP = 3;

function findBand(temp) {
  return OUTFITS_BY_TEMP.find(({ min }) => temp >= min);
}

function pickFrom(options, pick) {
  return options.length ? options[Math.floor(pick * options.length)] : null;
}

// 옷차림은 기온 대신 체감온도 기준으로 고름
function baseTemp(weather) {
  return weather?.feelsLike ?? weather?.temperature ?? null;
}

const BAD_DUST = ["나쁨", "매우나쁨"];

function isDustBad(weather) {
  return BAD_DUST.includes(weather?.air?.pm10Grade) || BAD_DUST.includes(weather?.air?.pm25Grade);
}

function dailyRange(weather) {
  if (weather?.minTemp == null || weather?.maxTemp == null) return null;
  return weather.maxTemp - weather.minTemp;
}

function buildOutfit(weather, picks) {
  const temp = baseTemp(weather);
  if (temp == null) return null;
  const band = findBand(temp);
  const outfit = {};
  for (const { key } of PARTS) {
    outfit[key] = pickFrom(band[key], picks[key]);
  }

  // 지금은 겉옷이 필요 없어도 일교차가 크면 아침·저녁 기온에 맞는 겉옷을 추가
  if (!outfit.outer && dailyRange(weather) >= BIG_RANGE) {
    outfit.outer = pickFrom(findBand(weather.minTemp).outer, picks.outer);
  }

  outfit.extras = [...(band.extras ?? []), ...(EXTRAS_BY_CONDITION[weather.condition] ?? [])];
  if (isDustBad(weather)) outfit.extras.push("마스크");
  return outfit;
}

function buildAdvice(weather) {
  const advice = [];
  const range = dailyRange(weather);
  if (range >= BIG_RANGE) {
    advice.push(`일교차가 ${Math.round(range)}°나 돼요. 입고 벗기 편한 겉옷을 챙기세요.`);
  }
  if (weather?.feelsLike != null && weather?.temperature != null) {
    const gap = Math.round(weather.feelsLike - weather.temperature);
    if (gap <= -FEELS_GAP) advice.push(`바람 때문에 ${-gap}° 더 춥게 느껴져요.`);
    if (gap >= FEELS_GAP) advice.push(`습도가 높아 ${gap}° 더 덥게 느껴져요.`);
  }
  if (isDustBad(weather)) advice.push("미세먼지가 나빠요. 마스크를 챙기세요.");
  return advice;
}

function formatTemp(value) {
  return `${Math.round(value)}°`;
}

function outfitKey(outfit) {
  return PARTS.map(({ key }) => outfit?.[key]).join("|");
}

export default function StyleCard({ weather, status, onClose }) {
  const today = new Date();
  const [picks, setPicks] = useState(randomPicks);
  const outfit = buildOutfit(weather, picks);
  const advice = buildAdvice(weather);
  // selected: null(사진 닫힘) | "set"(코디 전체 사진) | 옷 이름(그 옷 사진)
  const [selected, setSelected] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoStatus, setPhotoStatus] = useState("idle"); // idle | loading | ready | error
  const [photoError, setPhotoError] = useState("");
  const requestId = useRef(0);

  // 코디 전체 사진은 겉옷+상의+하의로 검색 (소품은 제외)
  function photoItems(target, currentOutfit) {
    if (target !== "set") return [target];
    return PARTS.map(({ key }) => currentOutfit[key]).filter(Boolean);
  }

  // 늦게 도착한 이전 요청 결과는 무시
  async function loadPhoto(items, excludeId) {
    const id = ++requestId.current;
    setPhotoStatus("loading");
    try {
      const next = await fetchStylePhoto(items, excludeId);
      if (id !== requestId.current) return;
      setPhoto(next);
      setPhotoStatus("ready");
    } catch (err) {
      if (id !== requestId.current) return;
      setPhotoError(err.message);
      setPhotoStatus("error");
    }
  }

  function closePhoto() {
    requestId.current++;
    setSelected(null);
    setPhoto(null);
    setPhotoStatus("idle");
  }

  function selectPhoto(target) {
    if (target === selected) {
      closePhoto();
      return;
    }
    setSelected(target);
    setPhoto(null);
    loadPhoto(photoItems(target, outfit));
  }

  // 다른 코디: 지금과 다른 조합이 나올 때까지 몇 번 다시 뽑음
  function shuffleOutfit() {
    let nextPicks = randomPicks();
    let next = buildOutfit(weather, nextPicks);
    for (let i = 0; i < 10 && outfitKey(next) === outfitKey(outfit); i++) {
      nextPicks = randomPicks();
      next = buildOutfit(weather, nextPicks);
    }
    setPicks(nextPicks);

    if (selected === "set") {
      setPhoto(null);
      loadPhoto(photoItems("set", next));
    } else if (selected) {
      closePhoto(); // 보고 있던 옷이 코디에서 빠졌을 수 있으므로 닫음
    }
  }

  function renderItem(label, item) {
    return (
      <button
        key={label}
        type="button"
        className={`style-item${item === selected ? " is-selected" : ""}`}
        aria-pressed={item === selected}
        onClick={() => selectPhoto(item)}
      >
        <span className="style-item-label">{label}</span>
        <span className="style-item-name">{item}</span>
      </button>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">STYLE</h2>
        <button className="icon-button" aria-label="설정" type="button">
          ⚙️
        </button>
      </div>

      <div className="style-display">
        <p className="style-question">오늘은 뭘 입지?</p>
        {status === "loading" ? (
          <span className="style-hint">날씨 확인 중...</span>
        ) : outfit ? (
          <>
            <p className="style-temps">
              체감 {formatTemp(baseTemp(weather))}
              {dailyRange(weather) != null &&
                ` · 최저 ${formatTemp(weather.minTemp)} / 최고 ${formatTemp(weather.maxTemp)}`}
            </p>
            {advice.length > 0 && (
              <ul className="style-advice">
                {advice.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <div className="style-set">
              {PARTS.filter(({ key }) => outfit[key]).map(({ key, label }) =>
                renderItem(label, outfit[key]),
              )}
            </div>
            {outfit.extras.length > 0 && (
              <ul className="style-tags">
                <li className="style-extras-label">챙길 것</li>
                {outfit.extras.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className={`style-tag${item === selected ? " is-selected" : ""}`}
                      aria-pressed={item === selected}
                      onClick={() => selectPhoto(item)}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="style-actions">
              <button type="button" className="style-action" onClick={shuffleOutfit}>
                다른 코디
              </button>
              <button
                type="button"
                className={`style-action primary${selected === "set" ? " is-selected" : ""}`}
                aria-pressed={selected === "set"}
                onClick={() => selectPhoto("set")}
              >
                {selected === "set" ? "사진 닫기" : "코디 사진 보기"}
              </button>
            </div>
          </>
        ) : (
          <span className="style-hint">기온 정보가 없어요</span>
        )}

        {selected && (
          <div className="style-photo">
            {photoStatus === "loading" && <span className="style-hint">사진 불러오는 중...</span>}
            {photoStatus === "error" && <span className="style-hint">{photoError}</span>}
            {photoStatus === "ready" && photo && (
              <>
                <img className="style-photo-img" src={photo.src} alt={photo.alt} />
                <div className="style-photo-meta">
                  <span className="style-credit">
                    Photo by{" "}
                    <a href={photo.authorUrl} target="_blank" rel="noreferrer">
                      {photo.author}
                    </a>{" "}
                    on{" "}
                    <a href={UNSPLASH_URL} target="_blank" rel="noreferrer">
                      Unsplash
                    </a>
                  </span>
                  <button
                    type="button"
                    className="style-next"
                    onClick={() => loadPhoto(photoItems(selected, outfit), photo.id)}
                  >
                    다른 사진
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        {/* <span className="card-label">CARD</span> */}
        <span className="card-date">{formatDate(today)}</span>
        <button className="close-button" aria-label="닫기" onClick={onClose} type="button">
          ✕
        </button>
      </div>
    </div>
  );
}
