import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AdminDashboard } from './components/AdminDashboard';
import { listenToFirestorePosts, deletePostFromFirestore } from './services/firebase';
import { FeedItem } from './types';

function StandaloneAdminApp() {
  const [feedPosts, setFeedPosts] = useState<FeedItem[]>([]);

  useEffect(() => {
    // Muat semua postingan untuk moderasi admin
    const unsub = listenToFirestorePosts((posts) => {
      setFeedPosts(posts);
    });
    return () => unsub();
  }, []);

  return (
    <AdminDashboard
      feedPosts={feedPosts}
      onBackToFeed={() => {
        // Arahkan kembali ke aplikasi warga
        window.location.href = '/';
      }}
      onPostDeleted={async (postId) => {
        await deletePostFromFirestore(postId);
      }}
    />
  );
}

const rootEl = document.getElementById('admin-root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <StandaloneAdminApp />
    </React.StrictMode>
  );
}
