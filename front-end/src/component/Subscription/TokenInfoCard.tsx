import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * ⭐️ 사용자 토큰 정보를 보여주는 카드 컴포넌트
 *   - 백엔드 `/api/users/me/tokens` (예시) GET 요청으로 토큰 잔액 조회
 *   - 로딩 / 에러 / 정상 3단계 UI 제공
 */

interface TokenInfo {
  balance: number;          // 현재 보유 토큰
  planName: string;         // 구독 플랜 이름 (FREE / BASIC / PRO)
  nextGrantDate: string;    // YYYY‑MM‑DD 형식 (ISO)
}

export default function TokenInfoCard(){
  const [data, setData] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    axios
      .post<TokenInfo>('/subscription/loadSubscription')
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message ?? '네트워크 오류');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="p-4 border rounded">로딩 중…</div>;
  if (error) return <div className="p-4 border rounded text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="p-4 border rounded shadow-md max-w-sm bg-white">
      <h2 className="text-lg font-bold mb-2">내 토큰 현황</h2>

      <div className="mb-2 flex justify-between">
        <span className="font-semibold">보유 토큰</span>
        <span>{data.balance.toLocaleString()} 개</span>
      </div>

      <div className="mb-2 flex justify-between">
        <span className="font-semibold">구독 플랜</span>
        <span>{data.planName}</span>
      </div>

      <div className="flex justify-between">
        <span className="font-semibold">다음 토큰 지급일</span>
        <span>{data.nextGrantDate}</span>
      </div>
    </div>
  );
};

