import { Switch, Route, Redirect } from "wouter";
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>XR Mobility Coach Dashboard</h1>
      <div className="card">
        <p>
          Noel McCarthy, C22533826 
        </p>
        <p>
          Vite + React + Tailwind CSS + Wouter 
        </p>
      </div>
      <p className="read-the-docs">
        Base skeleton project for XR Mobility Coach Dashboard
      </p>
    </>
  )
}

export default App
