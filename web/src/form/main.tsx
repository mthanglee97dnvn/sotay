import { render } from 'preact'
import '../styles.css'
import { FormApp } from './FormApp'
import { Sky } from '../ui/Sky'

render(<><Sky /><FormApp /></>, document.getElementById('app')!)
