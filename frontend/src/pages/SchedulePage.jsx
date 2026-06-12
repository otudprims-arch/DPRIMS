import SectionHeader from '../components/ui/SectionHeader'
import StatusBadge from '../components/ui/StatusBadge'

const SCHEDULE = [
  { id: 1, title: 'مسح المسار الرئيسي', desc: 'القطعة A - 300 cm', time: '08:00', status: 'completed' },
  { id: 2, title: 'مسح الفرع الشرقي', desc: 'القطعة B - 200 cm', time: '10:30', status: 'completed' },
  { id: 3, title: 'فحص وصلة التبديل', desc: 'نقطة التبديل رقم 3', time: '13:00', status: 'active' },
  { id: 4, title: 'مسح المسار الغربي', desc: 'القطعة C - 350 cm', time: '15:30', status: 'upcoming' },
  { id: 5, title: 'فحص شامل نهاية اليوم', desc: 'جميع القطع - تقرير ختامي', time: '17:00', status: 'upcoming' },
]

const STATUS_MAP = {
  completed: { label: 'مكتمل', variant: 'success' },
  active: { label: 'جاري التنفيذ', variant: 'warning' },
  upcoming: { label: 'قادم', variant: 'neutral' },
}

export default function SchedulePage() {
  return (
    <div className="page-stack">
      <SectionHeader title="الجدول الزمني" subtitle="Operational Schedule" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {SCHEDULE.map(item => {
          const st = STATUS_MAP[item.status]
          return (
            <div key={item.id} className="schedule-item">
              <span className={`schedule-dot ${item.status}`} />
              <div className="schedule-info">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--mono)', direction: 'ltr' }}>
                {item.time}
              </span>
              <StatusBadge status={st.label} variant={st.variant} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
