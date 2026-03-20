import React, { useState } from 'react';
import useStore from '../store/useStore';
import config from '../config';

export default function Header(props) {
  var isMobile = props.isMobile;
  var currentRoomIndex = useStore(function(s) { return s.currentRoomIndex; });
  var rooms = useStore(function(s) { return s.rooms; });
  var sections = useStore(function(s) { return s.sections; });

  var contactOpenState = useState(false);
  var contactOpen = contactOpenState[0];
  var setContactOpen = contactOpenState[1];

  var room = rooms[currentRoomIndex];
  var section = null;
  if (room) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === room.section) { section = sections[i]; break; }
    }
  }
  var sColor = section ? section.color : '#6366f1';

  return React.createElement('div', null,
    // Header bar
    React.createElement('div', {
      style: {
        height: isMobile ? 48 : 52,
        minHeight: isMobile ? 48 : 52,
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 20px',
        zIndex: 300,
      }
    },
      // Left: profile + name
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }
      },
        React.createElement('div', {
          style: {
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
          }
        },
          React.createElement('img', {
            src: config.profileImage,
            alt: '',
            style: { width: '100%', height: '100%', objectFit: 'cover' },
            onError: function(e) {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span style="color:' + sColor + ';font-size:14px;font-weight:bold">' + config.name.charAt(0) + '</span>';
            }
          })
        ),
        React.createElement('div', null,
          React.createElement('div', {
            style: {
              fontSize: isMobile ? 14 : 16,
              fontWeight: 700,
              color: '#fff',
              fontFamily: config.contentFont,
              lineHeight: 1.1,
            }
          }, config.name + ' ' + config.surname),
          !isMobile && section ? React.createElement('div', {
            style: {
              fontSize: 9, color: sColor + '90',
              fontFamily: config.uiFont,
              textTransform: 'uppercase',
              letterSpacing: 1.5, marginTop: 2,
            }
          }, section.name) : null
        )
      ),
      // Right: contact button
      React.createElement('button', {
        onClick: function() { setContactOpen(true); },
        style: {
          padding: isMobile ? '5px 10px' : '6px 14px',
          background: sColor + '18',
          border: '1px solid ' + sColor + '35',
          borderRadius: 6,
          color: sColor,
          fontSize: isMobile ? 10 : 11,
          fontFamily: config.uiFont,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }
      }, 'Contact')
    ),
    // Contact modal
    contactOpen ? React.createElement(ContactModal, {
      sColor: sColor,
      isMobile: isMobile,
      onClose: function() { setContactOpen(false); },
    }) : null
  );
}

function ContactModal(props) {
  var sColor = props.sColor;
  var isMobile = props.isMobile;
  var onClose = props.onClose;

  var nameState = useState('');
  var name = nameState[0];
  var setName = nameState[1];

  var emailState = useState('');
  var email = emailState[0];
  var setEmail = emailState[1];

  var subjectState = useState('');
  var subject = subjectState[0];
  var setSubject = subjectState[1];

  var messageState = useState('');
  var message = messageState[0];
  var setMessage = messageState[1];

  var statusState = useState('idle');
  var status = statusState[0];
  var setStatus = statusState[1];

  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  var handleSend = function() {
    // Validate
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!message.trim()) { setError('Please enter a message'); return; }
    setError('');
    setStatus('sending');

    var data = {
      access_key: config.contactFormKey,
      name: name,
      email: email,
      subject: subject || 'Portfolio Contact',
      message: message,
      from_name: name,
      replyto: email,
    };

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      if (result.success) {
        setStatus('sent');
        setTimeout(function() { onClose(); }, 2500);
      } else {
        setStatus('idle');
        setError('Failed to send. Please try again.');
      }
    })
    .catch(function() {
      setStatus('idle');
      setError('Network error. Opening email client...');
      setTimeout(function() {
        var body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message;
        window.location.href = 'mailto:' + config.email
          + '?subject=' + encodeURIComponent(subject || 'Portfolio Contact')
          + '&body=' + encodeURIComponent(body);
      }, 1500);
    });
  };

  var handleKeyDown = function(e) {
    if (e.key === 'Escape') onClose();
    // Prevent game controls while typing
    e.stopPropagation();
  };

  var inp = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#ddd',
    fontSize: 13,
    fontFamily: "'Inter', 'Outfit', sans-serif",
  };

  var labelStyle = {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: config.uiFont,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
    display: 'block',
  };

  if (status === 'sent') {
    return React.createElement('div', {
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); },
    },
      React.createElement('div', {
        style: {
          width: isMobile ? '85%' : 380,
          background: 'rgba(15,15,28,0.98)',
          border: '1px solid ' + sColor + '30',
          borderRadius: 12,
          padding: isMobile ? 24 : 32,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          textAlign: 'center',
        }
      },
        React.createElement('div', {
          style: {
            width: 50, height: 50, borderRadius: 25,
            background: sColor + '20',
            border: '2px solid ' + sColor + '50',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22, color: sColor,
          }
        }, '\u2713'),
        React.createElement('div', {
          style: {
            fontSize: 20, color: '#fff',
            fontFamily: config.contentFont, fontWeight: 700, marginBottom: 8,
          }
        }, 'Message Sent!'),
        React.createElement('div', {
          style: {
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            fontFamily: config.uiFont,
          }
        }, "I'll get back to you soon")
      )
    );
  }

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    onClick: function(e) { if (e.target === e.currentTarget) onClose(); },
    onKeyDown: handleKeyDown,
  },
    React.createElement('div', {
      style: {
        width: isMobile ? '90%' : 400,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'rgba(15,15,28,0.98)',
        border: '1px solid ' + sColor + '30',
        borderRadius: 12,
        padding: isMobile ? 20 : 28,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }
    },
      // Title row
      React.createElement('div', {
        style: {
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 20,
        }
      },
        React.createElement('div', null,
          React.createElement('div', {
            style: {
              fontSize: 20, color: '#fff',
              fontFamily: config.contentFont, fontWeight: 700,
            }
          }, 'Get in Touch'),
          React.createElement('div', {
            style: {
              fontSize: 10, color: 'rgba(255,255,255,0.3)',
              fontFamily: config.uiFont, marginTop: 4,
            }
          }, 'Message goes to ' + config.email)
        ),
        React.createElement('button', {
          onClick: onClose,
          style: {
            width: 28, height: 28, borderRadius: 14,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#888', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }
        }, '\u00D7')
      ),

      // Error message
      error ? React.createElement('div', {
        style: {
          padding: '8px 12px',
          background: 'rgba(255,80,80,0.1)',
          border: '1px solid rgba(255,80,80,0.2)',
          borderRadius: 6,
          color: '#ff6666',
          fontSize: 11,
          fontFamily: config.uiFont,
          marginBottom: 14,
        }
      }, error) : null,

      // Name field
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('label', { style: labelStyle }, 'Your Name'),
        React.createElement('input', {
          value: name,
          onChange: function(e) { setName(e.target.value); setError(''); },
          onKeyDown: handleKeyDown,
          placeholder: 'John Doe',
          style: inp,
        })
      ),

      // Email field
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('label', { style: labelStyle }, 'Your Email'),
        React.createElement('input', {
          value: email,
          onChange: function(e) { setEmail(e.target.value); setError(''); },
          onKeyDown: handleKeyDown,
          placeholder: 'john@example.com',
          type: 'email',
          style: inp,
        })
      ),

      // Subject field
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('label', { style: labelStyle }, 'Subject'),
        React.createElement('input', {
          value: subject,
          onChange: function(e) { setSubject(e.target.value); },
          onKeyDown: handleKeyDown,
          placeholder: 'Project inquiry',
          style: inp,
        })
      ),

      // Message field
      React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('label', { style: labelStyle }, 'Message'),
        React.createElement('textarea', {
          value: message,
          onChange: function(e) { setMessage(e.target.value); setError(''); },
          onKeyDown: handleKeyDown,
          placeholder: 'Tell me about your project...',
          rows: 4,
          style: Object.assign({}, inp, { resize: 'vertical', minHeight: 80 }),
        })
      ),

      // Send button
      React.createElement('button', {
        onClick: handleSend,
        disabled: status === 'sending',
        style: {
          width: '100%',
          padding: '12px',
          background: status === 'sending' ? 'rgba(255,255,255,0.03)' : sColor + '22',
          border: '1px solid ' + (status === 'sending' ? 'rgba(255,255,255,0.08)' : sColor + '45'),
          borderRadius: 6,
          color: status === 'sending' ? '#555' : sColor,
          fontSize: 12,
          fontFamily: config.uiFont,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          transition: 'all 0.15s',
          opacity: status === 'sending' ? 0.6 : 1,
        }
      }, status === 'sending' ? 'Sending...' : 'Send Message')
    )
  );
}