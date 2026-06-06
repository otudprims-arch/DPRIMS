export default function PanelShell({ title, children, className, headerRight }) {
  return (
    <div className={`panel ${className || ''}`}>
      {title && (
        <div className="panel-header">
          <h3 className="panel-title">{title}</h3>
          {headerRight}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  )
}