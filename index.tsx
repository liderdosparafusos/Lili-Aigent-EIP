const rootElement = document.getElementById('root');

console.log('ROOT ELEMENT:', rootElement);

const root = ReactDOM.createRoot(
  rootElement || document.body
);

root.render(
  <React.StrictMode>
    <div style={{ color: 'white', padding: 20 }}>
      React carregou 🚀
    </div>
  </React.StrictMode>
);
