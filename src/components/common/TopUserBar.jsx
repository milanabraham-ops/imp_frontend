import ThemeToggle from './ThemeToggle'
import AccountMenu from './AccountMenu'

export default function TopUserBar() {
  return (
    <div className="dash-userbar">
      <ThemeToggle />
      <AccountMenu />
    </div>
  )
}
