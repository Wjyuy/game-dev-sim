'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/clientConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false); // 회원가입 모드인지 로그인 모드인지
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 로그인 성공 시, 게임 시뮬레이션 페이지로 리다이렉트
      // onAuthStateChanged 리스너가 userId를 감지하고 fetchUserData를 실행할 것
      router.push('/game-simulation'); 
    } catch (err: any) {
      console.error("로그인 실패:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("잘못된 이메일 또는 비밀번호입니다.");
      } else if (err.code === 'auth/invalid-email') {
        setError("유효하지 않은 이메일 형식입니다.");
      } else {
        setError("로그인에 실패했습니다: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("회원가입 성공:", userCredential.user);
      // 회원가입 성공 시, 캐릭터 생성 페이지로 리다이렉트
      router.push('/character-creation');
    } catch (err: any) {
      console.error("회원가입 실패:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("이미 사용 중인 이메일입니다.");
      } else if (err.code === 'auth/weak-password') {
        setError("비밀번호는 6자 이상이어야 합니다.");
      } else if (err.code === 'auth/invalid-email') {
        setError("유효하지 않은 이메일 형식입니다.");
      } else {
        setError("회원가입에 실패했습니다: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="p-8 w-full max-w-md shadow-lg dark:bg-gray-800">
        <Card.Header>
          <h1 className="text-3xl font-bold text-center mb-6 dark:text-white">
            {isRegistering ? '회원가입' : '로그인'}
          </h1>
        </Card.Header>
        <Card.Body>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
              이메일
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            {isRegistering ? (
              <Button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-2 px-4 text-lg bg-green-600 hover:bg-green-700 focus:ring-green-500"
              >
                {loading ? '회원가입 중...' : '회원가입'}
              </Button>
            ) : (
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-2 px-4 text-lg bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            )}
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-bold text-blue-500 hover:text-blue-800 text-sm dark:text-blue-400 dark:hover:text-blue-600"
              disabled={loading}
            >
              {isRegistering ? '계정이 이미 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}