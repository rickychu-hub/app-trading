import Layout from './components/layout/Layout';
import NewsIntelligencePanel from './components/dashboard/NewsIntelligencePanel';

function App() {
  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Dashboard General
        </h2>
        <p className="text-gray-400">Bienvenido a su centro de inteligencia financiera.</p>
      </div>

      <NewsIntelligencePanel />
    </Layout>
  );
}

export default App;
