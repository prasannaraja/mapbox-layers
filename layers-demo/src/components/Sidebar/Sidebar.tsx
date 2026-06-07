import React, { useState } from 'react';
import './Sidebar.css';
import { BarChart2, MapPin, LayoutGrid, ChevronDown, ChevronRight, Layers, Map, Menu } from 'lucide-react';

interface NavItem { id: string; label: string; icon: React.ReactNode; }
interface NavGroup { id: string; label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { id: 'menu-01', label: 'Menu 01', icon: <BarChart2 size={16} /> },
      { id: 'menu-02', label: 'Menu 02', icon: <Layers size={16} /> },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'location', label: 'Location', icon: <MapPin size={16} /> },
      { id: 'menu-03', label: 'Menu 03',   icon: <LayoutGrid size={16} /> },
      { id: 'menu-04', label: 'Menu 04',   icon: <Map size={16} /> },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const [activeItem, setActiveItem] = useState('location');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    insights: true,
    tools: true,
  });

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && <span className="sidebar__logo">RetailZone</span>}
        <button className="sidebar__toggle" onClick={onToggle} title="Toggle sidebar">
          <Menu size={18} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map(group => (
          <div key={group.id} className="sidebar__group">
            <button
              className="sidebar__group-header"
              onClick={() => !collapsed && toggleGroup(group.id)}
            >
              {collapsed
                ? <span className="sidebar__group-dot" />
                : (
                  <>
                    <span className="sidebar__group-label">{group.label}</span>
                    {expandedGroups[group.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </>
                )}
            </button>

            {(collapsed || expandedGroups[group.id]) && (
              <ul className="sidebar__items">
                {group.items.map(item => (
                  <li key={item.id}>
                    <button
                      className={`sidebar__item ${activeItem === item.id ? 'sidebar__item--active' : ''}`}
                      onClick={() => setActiveItem(item.id)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar__item-icon">{item.icon}</span>
                      {!collapsed && <span className="sidebar__item-label">{item.label}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
