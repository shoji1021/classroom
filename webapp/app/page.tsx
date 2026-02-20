'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const classes = ['1F', '2F', '3F', '1M', '2M', '3M'];

export default function Home() {
  const router = useRouter();

  const handleClassSelect = (className: string) => {
    router.push(`/timetable/${className}`);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>クラス選択</h1>
        <p className={styles.subtitle}>時間割を表示するクラスを選んでください</p>
        
        <div className={styles.classGrid}>
          {classes.map((className) => (
            <button
              key={className}
              className={styles.classButton}
              onClick={() => handleClassSelect(className)}
            >
              {className}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
