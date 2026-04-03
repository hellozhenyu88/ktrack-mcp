import { Outlet, Link, useLocation } from 'react-router-dom';

export default function PublicLayout() {
    const { pathname } = useLocation();

    return (
        <div className="public-page">
            <nav className="navbar">
                <Link to="/" className="navbar-brand">
                    <div className="logo-icon">T</div>
                    <span>TimeLinker</span>
                </Link>
                <div className="navbar-links">
                    <Link to="/" className={pathname === '/' ? 'active' : ''}>首页</Link>
                    <Link to="/pricing" className={pathname === '/pricing' ? 'active' : ''}>定价</Link>
                    <Link to="/docs" className={pathname === '/docs' ? 'active' : ''}>文档</Link>
                    <Link to="/apply">
                        <button className="btn-nav-primary">获取 API Key</button>
                    </Link>
                    <Link to="/console">
                        <button className="btn-nav-ghost">控制台</button>
                    </Link>
                </div>
            </nav>
            <Outlet />
            <footer className="footer">
                <div className="footer-inner">
                    <span>© 2026 TimeLinker · Built by 开物数迹科技</span>
                    <span className="footer-links">
                        <Link to="/docs">文档</Link>
                        <Link to="/pricing">定价</Link>
                        <a href="mailto:dev@timelinker.dev">联系我们</a>
                    </span>
                </div>
            </footer>
        </div>
    );
}
