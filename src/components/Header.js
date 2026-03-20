import React from 'react';
import useStore from '../store/useStore';
import config from '../config';

export default function Header(props) {
  var isMobile = props.isMobile;
  var currentRoomIndex = useStore(function(s) { return s.currentRoomIndex; });
  var rooms = useStore(function(s) { return s.rooms; });
  var sections = useStore(function(s) { return s.sections; });

  var room = rooms[currentRoomIndex];
  var section = null;
  if (room) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === room.section) { section = sections[i]; break; }
    }
  }
  var sColor = section ? section.color : '#6366f1';

  return (
    <div style={{
      height: isMobile ? 48 : 52,
      minHeight: isMobile ? 48 : 52,
      background: 'rgba(0,0,0,0.3)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 20px',
      zIndex: 300,
    }}>
      {/* Left: Profile + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
        {/* Profile image */}
        <div style={{
          width: isMobile ? 30 : 34,
          height: isMobile ? 30 : 34,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid ' + sColor + '50',
          flexShrink: 0,
          background: sColor + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={config.profileImage}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
            onError={function(e) {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span style="color:' + sColor + ';font-size:14px;font-family:' + config.contentFont + '">' + config.name.charAt(0) + '</span>';
            }}
          />
        </div>

        {/* Name */}
        <div>
          <div style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: config.contentFont,
            lineHeight: 1.1,
          }}>
            {config.name} {config.surname}
          </div>
          {!isMobile && section && (
            <div style={{
              fontSize: 9,
              color: sColor + '90',
              fontFamily: config.uiFont,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginTop: 2,
            }}>
              {section.name}
            </div>
          )}
        </div>
      </div>

      {/* Right: Contact */}
      <a
        href={'mailto:' + config.email}
        style={{
          padding: isMobile ? '5px 10px' : '6px 14px',
          background: sColor + '18',
          border: '1px solid ' + sColor + '35',
          borderRadius: 6,
          color: sColor,
          fontSize: isMobile ? 10 : 11,
          fontFamily: config.uiFont,
          textDecoration: 'none',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={function(e) { e.target.style.background = sColor + '30'; }}
        onMouseLeave={function(e) { e.target.style.background = sColor + '18'; }}
      >
        Contact
      </a>
    </div>
  );
}