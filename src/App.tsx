import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LibraryStateProvider } from './app/LibraryState'
import { IdentityAuthProvider } from './auth/IdentityAuthContext'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <IdentityAuthProvider>
        <LibraryStateProvider>
          <AppRouter />
        </LibraryStateProvider>
      </IdentityAuthProvider>
    </BrowserRouter>
  )
}

export default App
