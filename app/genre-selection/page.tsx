// app/genre-selection/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/clientConfig'; // 🔥 auth 임포트
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth'; // 🔥 Firebase User 타입 임포트
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js 등록 (Next.js App Router에서 클라이언트 컴포넌트 내에서 한 번만)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type GameGenre = 'rpg' | 'puzzle' | 'action' | 'simulation';

const genreData = {
  rpg: { description: '깊이 있는 스토리와 캐릭터 육성!', estimatedRevenue: 80, difficulty: 7, userBase: 70 },
  puzzle: { description: '두뇌를 자극하는 재미와 간단한 규칙!', estimatedRevenue: 50, difficulty: 4, userBase: 60 },
  action: { description: '빠른 반응과 스릴 넘치는 액션!', estimatedRevenue: 90, difficulty: 8, userBase: 90 },
  simulation: { description: '현실을 재현하는 몰입감 있는 경험!', estimatedRevenue: 70, difficulty: 6, userBase: 50 },
};

export default function GenreSelectionPage() {
  const [selectedGenre, setSelectedGenre] = useState<GameGenre | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // ⭐ userId 상태 추가
  const [loading, setLoading] = useState(true); // ⭐ 로딩 상태 추가
  const [error, setError] = useState<string | null>(null); // ⭐ 에러 상태 추가
  const router = useRouter();

  // ⭐ Firebase Auth 상태 변경 리스너 ⭐
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        setLoading(false); // 로딩 완료
      } else {
        setUserId(null);
        setLoading(false); // 로딩 완료
        setError("로그인이 필요합니다."); // 임시 에러 메시지
        // router.replace('/login'); // TODO: 실제 로그인 페이지 경로로 변경
      }
    });

    return () => unsubscribe();
  }, [router]);


  const chartData = {
    labels: ['예상 수익 (억)', '난이도 (1-10)', '예상 유저 (만)'],
    datasets: [
      {
        label: selectedGenre ? `${genreData[selectedGenre].description} - ${selectedGenre.toUpperCase()}` : '장르를 선택하세요',
        data: selectedGenre ? 
          [genreData[selectedGenre].estimatedRevenue, genreData[selectedGenre].difficulty, genreData[selectedGenre].userBase] :
          [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(107 114 128)', // Tailwind gray-500
        },
      },
      title: {
        display: true,
        text: '선택 장르 시장 예측',
        color: 'rgb(107 114 128)', // Tailwind gray-500
      },
    },
    scales: {
        x: {
            ticks: { color: 'rgb(107 114 128)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' } // dark mode 대비
        },
        y: {
            ticks: { color: 'rgb(107 114 128)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' } // dark mode 대비
        }
    }
  };

  const handleNext = async () => {
    if (!userId) {
      alert("로그인 정보가 없습니다. 다시 로그인 해주세요.");
      // router.push('/login'); // TODO: 실제 로그인 페이지 경로로 변경
      return;
    }
    if (!selectedGenre) {
      alert("장르를 선택해주세요!");
      return;
    }

    setLoading(true); // 데이터 저장 시작 시 로딩
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        currentStep: 2,
        genre: {
          selected: selectedGenre,
          marketDataSnapshot: genreData[selectedGenre],
        },
        updatedAt: serverTimestamp(),
      });
      
      router.push('/coding-challenge'); // 다음 페이지로 이동
    } catch (err: any) { // error 변수명을 err로 변경하여 충돌 방지
      console.error("장르 정보 저장 실패:", err);
      alert("장르 정보를 저장하는 데 실패했습니다. 다시 시도해주세요.");
      setError("장르 정보 저장 실패.");
    } finally {
      setLoading(false); // 로딩 해제
    }
  };

  // ⭐ 로딩 및 에러 상태 처리 ⭐
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl dark:text-white">
        로그인 상태 확인 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-xl text-center">
        오류: {error}
        {/* 로그인 페이지로 이동 버튼 등 추가 가능 */}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-500 text-xl dark:text-gray-400">
        로그인이 필요합니다.
        {/* <Button onClick={() => router.push('/login')} className="mt-4">로그인 페이지로</Button> */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8 dark:text-white">어떤 장르의 게임을 개발하시겠어요?</h1>
      
      {/* 장르 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(genreData).map(([genreType, data]) => (
          <Card
            key={genreType}
            onClick={() => setSelectedGenre(genreType as GameGenre)}
            className={`cursor-pointer ${selectedGenre === genreType ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200'} transition-all duration-200 dark:border-gray-700`}
            hover
          >
            <Card.Body>
              <h2 className="text-xl font-semibold mb-2 capitalize dark:text-white">{genreType}</h2>
              <p className="text-gray-600 dark:text-gray-400">{data.description}</p>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* 시장 데이터 차트 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-12 dark:bg-gray-800">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="text-center">
        <Button onClick={handleNext} disabled={!selectedGenre || loading}>
          {loading ? '저장 중...' : '다음 단계로'}
        </Button>
      </div>
    </div>
  );
}