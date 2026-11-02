import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LibraryStateProvider } from './app/LibraryState'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <LibraryStateProvider>
        <AppRouter />
      </LibraryStateProvider>
    </BrowserRouter>
  )
}

export default App
