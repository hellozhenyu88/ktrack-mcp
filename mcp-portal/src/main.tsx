import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ConfigProvider
            locale={zhCN}
            theme={{
                token: {
                    colorPrimary: '#6366f1',
                    borderRadius: 12,
                    fontFamily: `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Inter', sans-serif`,
                },
            }}
        >
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <App />
            </BrowserRouter>
        </ConfigProvider>
    </StrictMode>,
);
