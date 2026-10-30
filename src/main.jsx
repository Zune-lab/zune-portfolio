import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import './index.css';
import './styles/skins/index.css'; // SAU index.css: cùng độ ưu tiên thì skin thắng theme sáng/tối mặc định
import './mobile/index.css'; // SAU CÙNG: CSS riêng cho điện thoại, mỗi trang một file (src/mobile/)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
