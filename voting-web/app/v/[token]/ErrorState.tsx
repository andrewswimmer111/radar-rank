import styles from './styles.module.css';

export function ErrorState() {
  return (
    <main className={styles.errorWrap}>
      <div className={styles.errorCard}>
        <h1 className={styles.errorTitle}>This link isn&apos;t active</h1>
        <p className={styles.errorBody}>
          The evaluation may have been unshared, or the link is invalid. Ask
          the person who sent it to share a new one.
        </p>
      </div>
    </main>
  );
}
