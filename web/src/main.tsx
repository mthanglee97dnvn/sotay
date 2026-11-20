import { render } from 'preact'
import './styles.css'
import { App } from './ui/App'
import { watchTheme } from './theme'

watchTheme()

render(<App />, document.getElementById('app')!)
