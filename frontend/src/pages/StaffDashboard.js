import React, { useState, useEffect, useRef } from "react";
import "./StaffDashboard.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  
  // Filters
  const [filterYear, setFilterYear] = useState("3rd Year");
  const [filterDept, setFilterDept] = useState("IT");
  const [searchQuery, setSearchQuery] = useState("");

  // Dropdown States
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const overviewRef = useRef(null);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem("soundEnabled") !== "false");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "light-theme";
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      return newTheme;
    });
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const newState = !prev;
      localStorage.setItem("soundEnabled", newState);
      return newState;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusData, setStatusData] = useState([]);
  const [selectedAssignmentName, setSelectedAssignmentName] = useState("");


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const assignmentsPerPage = 6;

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      // Try to set sensible defaults if staff
      if (storedUser.department) setFilterDept(storedUser.department);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const fetchAssignments = async () => {
    if (!filterYear || !filterDept) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/assignments/student?year=${filterYear}&department=${filterDept}`
      );
      
      const assignmentsWithStats = await Promise.all(res.data.map(async (a) => {
        try {
          const statusRes = await axios.get(`http://localhost:5000/api/assignments/${a._id}/status`);
          const total = statusRes.data.length;
          const submitted = statusRes.data.filter(s => s.submitted).length;
          return { ...a, totalStudents: total, submittedCount: submitted };
        } catch {
          return { ...a, totalStudents: 0, submittedCount: 0 };
        }
      }));
      
      // Sort by newest first or just set it
      setAssignments(assignmentsWithStats.reverse());
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line
  }, [filterYear, filterDept]);



  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleViewStatus = async (a) => {
    try {
      setSelectedAssignmentName(a.subjectName);
      const res = await axios.get(`http://localhost:5000/api/assignments/${a._id}/status`);
      setStatusData(res.data);
      setStatusModalOpen(true);
    } catch (error) {
      console.log("View status error:", error);
      alert("Failed to fetch assignment status ❌");
    }
  };

  const isOverdue = (date) => new Date() > new Date(date);

  // Stats calculation
  const totalAssigned = assignments.length;
  let totalPending = 0;
  let totalSubmitted = 0;
  let totalOverdue = 0;

  assignments.forEach(a => {
    const overdue = isOverdue(a.dueDate);
    if (overdue) totalOverdue++;
    
    // Simplistic pending/submitted for the summary cards
    // The "submitted" in staff view means all submissions across all students
    totalSubmitted += a.submittedCount;
    totalPending += (a.totalStudents - a.submittedCount);
  });

  // Filter & Pagination logic
  let filtered = assignments;
  if (searchQuery) {
    filtered = assignments.filter(a => 
      a.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assignmentNumber.toString().includes(searchQuery)
    );
  }

  const indexOfLast = currentPage * assignmentsPerPage;
  const indexOfFirst = indexOfLast - assignmentsPerPage;
  const currentAssignments = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / assignmentsPerPage);

  const getStatusColor = (a) => {
    if (isOverdue(a.dueDate)) return "red";
    if (a.submittedCount === a.totalStudents && a.totalStudents > 0) return "green";
    return "yellow";
  };

  const getStatusText = (a) => {
    if (isOverdue(a.dueDate)) return "Overdue";
    if (a.submittedCount === a.totalStudents && a.totalStudents > 0) return "Completed";
    return "Ongoing";
  };

  return (
    <div className="staff-dashboard-wrapper">
      
      {/* SIDEBAR */}
      <div className="staff-sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">📝</span>
          <div>
            <h2>AssignTrack</h2>
            <small>Track • Manage • Achieve</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button className="nav-item" onClick={() => navigate('/upload-assignment')}>
            <span className="nav-icon">➕</span> Create Assignment
          </button>
          <button className="nav-item" onClick={() => overviewRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="nav-icon">📋</span> My Assignments
          </button>
          <button className="nav-item">
            <span className="nav-icon">✅</span> Submissions
          </button>
          <button className="nav-item">
            <span className="nav-icon">🎓</span> Students
          </button>
          <button className="nav-item">
            <span className="nav-icon">📈</span> Reports
          </button>
          <button className="nav-item" onClick={() => setShowCalendar(true)}>
            <span className="nav-icon">📅</span> Calendar
          </button>
          <button className="nav-item">
            <span className="nav-icon">🔔</span> Notifications
            <span className="nav-badge">6</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">⚙️</span> Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={handleLogout}>
            <span className="nav-icon">⏻</span> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="staff-main-panel">
        
        {/* TOP NAVBAR */}
        <header className="staff-top-navbar">
          <div className="nav-left">
            <button className="hamburger-btn">☰</button>
            <h1 className="page-title">Class Assignments Overview</h1>
          </div>
          <div className="nav-right">
            <div className="notification-wrapper" ref={notificationRef}>
              <button className="icon-btn bell-btn" onClick={() => setShowNotifications(!showNotifications)}>
                🔔
                <span className="notification-badge">6</span>
              </button>
              
              {showNotifications && (
                <div className="staff-dropdown-menu">
                  <h4 className="dropdown-header">Notifications</h4>
                  <p style={{fontSize: '13px', color: 'var(--staff-text-muted)', margin: 0, padding: '8px'}}>No new notifications.</p>
                </div>
              )}
            </div>

            <div className="user-profile-nav" ref={profileRef} onClick={() => setShowProfile(!showProfile)} style={{ position: 'relative' }}>
              <div className="nav-avatar">{user?.name?.charAt(0).toUpperCase() || "S"}</div>
              <div className="nav-user-info">
                <span className="nav-user-name">{user?.name || "Dr. Staff"}</span>
                <span className="nav-user-role">{user?.department || ""}</span>
              </div>
              <span className="nav-dropdown-icon">▼</span>

              {showProfile && (
                <div className="staff-profile-popup">
                  <div className="popup-header-section">
                    <div className="popup-avatar-large">
                      {user?.name?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div className="popup-user-info">
                      <h4>{user?.name || "Dr. Staff"}</h4>
                      <p>{user?.email || "staff@example.com"}</p>
                      <small>Role: Teaching Staff</small>
                    </div>
                  </div>
                  
                  <hr className="popup-divider" />
                  
                  <div className="popup-menu-section">
                    <button className="popup-menu-item" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
                      {soundEnabled ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                      )}
                      <span>Sound Alerts: {soundEnabled ? "ON" : "OFF"}</span>
                    </button>
                    <button className="popup-menu-item" onClick={(e) => { e.stopPropagation(); toggleTheme(); }}>
                      {theme === "light" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                      )}
                      <span>{theme === "light" ? "Dark Theme" : "Light Theme"}</span>
                    </button>
                  </div>
                  
                  <hr className="popup-divider" />
                  
                  <div className="popup-footer-section">
                    <button className="popup-menu-item logout-btn" onClick={handleLogout}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* FILTERS ROW */}
        <div className="filters-row">
          <div className="filters-group">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
            </select>
          </div>
          <button className="btn-primary" onClick={() => navigate('/upload-assignment')}>
            + Upload New Assignment
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="staff-stats-grid">
          <div className="staff-stat-card border-blue">
            <div className="icon-wrapper blue">📋</div>
            <div className="stat-content">
              <h3>{totalAssigned} Total Assignments</h3>
              <p>For {filterYear} - {filterDept}</p>
            </div>
          </div>
          <div className="staff-stat-card border-yellow">
            <div className="icon-wrapper yellow">⏳</div>
            <div className="stat-content">
              <h3>{totalPending} Pending Submissions</h3>
              <p>Needs action</p>
            </div>
          </div>
          <div className="staff-stat-card border-green">
            <div className="icon-wrapper green">✓</div>
            <div className="stat-content">
              <h3>{totalSubmitted} Submitted</h3>
              <p>Successfully completed</p>
            </div>
          </div>
          <div className="staff-stat-card border-red">
            <div className="icon-wrapper red">!</div>
            <div className="stat-content">
              <h3>{totalOverdue} Overdue</h3>
              <p>Past deadlines</p>
            </div>
          </div>
        </div>

        {/* SUBMISSION OVERVIEW TABLE */}
        <div className="staff-table-panel" ref={overviewRef}>
          <div className="table-header">
            <h2>Submission Overview</h2>
            <div className="table-search">
              <span>🔍</span>
              <input 
                type="text" 
                placeholder="Search assignments..." 
                value={searchQuery}
                onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
              />
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Assignment Number</th>
                  <th>Subject</th>
                  <th>Class / Year</th>
                  <th>Due Date</th>
                  <th>Submitted / Total</th>
                  <th>Submission %</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentAssignments.length === 0 ? (
                  <tr><td colSpan="9" style={{textAlign: "center", padding: "30px"}}>No assignments found.</td></tr>
                ) : (
                  currentAssignments.map((a, index) => {
                    const rowStatus = getStatusColor(a);
                    const pct = a.totalStudents === 0 ? 0 : Math.round((a.submittedCount / a.totalStudents) * 100);
                    
                    return (
                      <tr key={a._id}>
                        <td>#{indexOfFirst + index + 1}</td>
                        <td className="font-semibold">
                          <div className="title-cell">
                            <span className="file-icon">📄</span>
                            {a.assignmentNumber}
                          </div>
                        </td>
                        <td>{a.subjectName}</td>
                        <td>{filterDept} - {filterYear}</td>
                        <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                        <td className="font-semibold">{a.submittedCount} / {a.totalStudents}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-bar-bg">
                              <div className={`progress-fill bg-${rowStatus}`} style={{width: `${pct}%`}}></div>
                            </div>
                            <span>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`staff-badge badge-${rowStatus}`}>
                            {getStatusText(a)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-icon view" onClick={() => handleViewStatus(a)}>👁️</button>
                            <button className="action-icon more">⋮</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-footer">
            <p>Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filtered.length)} of {filtered.length} assignments</p>
            <div className="pagination-controls">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i} 
                  className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS MODAL */}
      {statusModalOpen && (
        <div className="modal-overlay" onClick={() => setStatusModalOpen(false)}>
          <div className="status-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submission Status</h2>
              <p>{selectedAssignmentName}</p>
              <button className="close-btn" onClick={() => setStatusModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.map((d) => (
                    <tr key={d._id}>
                      <td>{d.registerNumber}</td>
                      <td>{d.name}</td>
                      <td>
                        {d.submitted ? (
                          <span className="staff-badge badge-green">Submitted</span>
                        ) : (
                          <span className="staff-badge badge-yellow">Not Submitted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL */}
      {showCalendar && (
        <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
          <div className="status-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>📅 Academic Calendar</h2>
              <button className="close-btn" onClick={() => setShowCalendar(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--staff-text-muted)' }}>
                 <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                  {Array.from({length: 30}).map((_, i) => (
                    <div key={i} style={{ 
                        padding: '10px', 
                        background: (i+1 === new Date().getDate()) ? 'var(--staff-primary)' : 'var(--staff-bg)', 
                        color: (i+1 === new Date().getDate()) ? 'white' : 'var(--staff-text-main)',
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                      {i + 1}
                    </div>
                  ))}
               </div>
               <hr style={{ border: 'none', borderTop: '1px solid var(--staff-border)', margin: '20px 0 15px' }} />
               <div style={{ textAlign: 'center', color: 'var(--staff-text-muted)' }}>
                 Upcoming: <b style={{color: 'var(--staff-red-text)'}}>{totalPending} Pending Submissions</b>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffDashboard;