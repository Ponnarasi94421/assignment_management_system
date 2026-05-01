import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./StudentDashboard.css";
import { useLocation } from "react-router-dom";

function StudentDashboard() {
  const location = useLocation();
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const profileRef = useRef(null);

  // Navigation State
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showCalendar, setShowCalendar] = useState(false);
  const myAssignmentsRef = useRef(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState("Profile Settings");

  // Profile Form State
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
    registerNumber: "",
    department: "",
    phone: "",
    language: "English"
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState({ status: '', message: '' });

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Sound State
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("soundEnabled") !== "false"
  );
  const audioRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));
  const audioTimeoutRef = useRef(null);
  const prevNotifCountRef = useRef(0);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newState = !prev;
      localStorage.setItem("soundEnabled", newState);
      return newState;
    });
  };

  const playSound = (type) => {
    if (!soundEnabled || !audioRef.current) return;
    
    stopSound(); // clear any previous playing
    
    let duration = 0;
    if (type === 'NEW_ASSIGNMENT') {
      audioRef.current.loop = false;
    } else if (type === 'DUE_SOON') {
      audioRef.current.loop = true;
      duration = 15000;
    } else if (type === 'OVERDUE') {
      audioRef.current.loop = true;
      duration = 20000;
    }

    audioRef.current.play().catch(e => console.log("Audio play blocked (user hasn't interacted yet):", e));
    
    if (duration > 0 && audioRef.current.loop) {
      audioTimeoutRef.current = setTimeout(() => {
        stopSound();
      }, duration);
    }
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
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

  // separate file for each assignment
  const [files, setFiles] = useState({});

  // track submitted assignments
  const [submittedAssignments, setSubmittedAssignments] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Staff View Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusData, setStatusData] = useState([]);
  const [selectedAssignmentName, setSelectedAssignmentName] = useState("");

  // Staff Filters
  const [filterYear, setFilterYear] = useState(location.state?.year || "1st Year");
  const [filterDept, setFilterDept] = useState(location.state?.department || "CSE");

  // load user
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // Sync profile form data when user state changes
  useEffect(() => {
    if (user) {
      setProfileFormData({
        name: user.name || "",
        email: user.email || "",
        registerNumber: user.registerNumber || "",
        department: user.department || "",
        phone: user.phone || "",
        language: user.language || "English"
      });
    }
  }, [user]);

  // handle theme change
  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "light-theme";
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // fetch assignments + submissions
  useEffect(() => {
    if (!user) return;

    const queryYear = user.role === "staff" ? filterYear : user.year;
    const queryDept = user.role === "staff" ? filterDept : user.department;

    if (!queryYear || !queryDept) return;

    const fetchAssignments = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/assignments/student?year=${queryYear}&department=${queryDept}`
        );
        setAssignments(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    // ✅ FIXED: correct route
    const fetchSubmissions = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser.role !== "student") return;

        const res = await axios.get(
          `http://localhost:5000/api/submissions/student/${storedUser.id}`
        );
        console.log("SUBMISSIONS DATA 👉", res.data);


        const submittedMap = {};
        res.data.forEach((s) => {
          submittedMap[s.assignmentId.toString()] = true;
        });

        setSubmittedAssignments(submittedMap);

      } catch (error) {
        console.log("Submission fetch error:", error);
      }
    };

    // ✅ Fetch Notifications (Initial Load)
    const fetchNotifications = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser.role !== "student") return;

        const res = await axios.get(
          `http://localhost:5000/api/notifications/student/${storedUser.id}`
        );
        prevNotifCountRef.current = res.data.length;
        setNotifications(res.data);
      } catch (error) {
        console.log("Notification fetch error:", error);
      }
    };

    fetchAssignments();
    fetchSubmissions();
    fetchNotifications();

  }, [user, filterYear, filterDept]);

  // ✅ Polling Notifications every 15s
  useEffect(() => {
    if (!user || user.role !== "student") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/notifications/student/${user.id}`
        );
        const newCount = res.data.length;
        if (newCount > prevNotifCountRef.current && prevNotifCountRef.current !== 0) {
           const latestNotif = res.data[0];
           if (latestNotif && !latestNotif.isRead) {
              playSound(latestNotif.type || 'NEW_ASSIGNMENT');
           }
        }
        prevNotifCountRef.current = newCount;
        setNotifications(res.data);
      } catch (error) {
         console.log(error);
      }
    }, 15000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, soundEnabled]);

  const isOverdue = (date) => new Date() > new Date(date);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // file change
  const handleFileChange = (assignmentId, file) => {
    setFiles((prev) => ({
      ...prev,
      [assignmentId]: file,
    }));
  };

  // file submit
  const handleSubmitAssignment = async (assignmentId) => {
    const selectedFile = files[assignmentId];

    if (!selectedFile) {
      alert("Select file first ❌");
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("studentId", storedUser.id);
      formData.append("assignmentId", assignmentId);

      await axios.post(
        "http://localhost:5000/api/submissions/submit",
        formData
      );

      // alert("Submitted Successfully ✅");

      setSubmittedAssignments((prev) => ({
        ...prev,
        [assignmentId]: true,
      }));

      setFiles((prev) => ({
        ...prev,
        [assignmentId]: null,
      }));

    } catch (error) {
      console.log(error);
      alert("Submission Failed ❌");
    }
  };

  // Profile Handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [name]: value }));
    setProfileSaveStatus({ status: '', message: '' });
  };

  const handleProfileSave = async () => {
    try {
      setProfileSaveStatus({ status: 'loading', message: 'Saving...' });
      const res = await axios.put(`http://localhost:5000/api/auth/update-profile/${user.id || user._id}`, profileFormData);
      
      const updatedUser = { ...user, ...res.data.user };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setProfileSaveStatus({ status: 'success', message: 'Profile updated successfully! ✅' });
      
      setTimeout(() => {
        setProfileSaveStatus({ status: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setProfileSaveStatus({ status: 'error', message: error.response?.data?.message || 'Failed to update profile ❌' });
    }
  };

  // Google Form submit
  const handleMarkSubmitted = async (assignmentId) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      const formData = new FormData();
      formData.append("studentId", storedUser.id);
      formData.append("assignmentId", assignmentId);

      await axios.post(
        "http://localhost:5000/api/submissions/submit",
        formData
      );

      // alert("Marked as Submitted (Google Form) ✅");

      setSubmittedAssignments((prev) => ({
        ...prev,
        [assignmentId]: true,
      }));
    } catch (error) {
      console.log("Mark as submit error:", error);
      alert("Failed to Mark as Submitted ❌");
    }
  };

  // Staff: View Assignment Status
  const handleViewStatus = async (assignment) => {
    try {
      setSelectedAssignmentName(assignment.subjectName);
      const res = await axios.get(`http://localhost:5000/api/assignments/${assignment._id}/status`);
      setStatusData(res.data);
      setStatusModalOpen(true);
    } catch (error) {
      console.log("View status error:", error);
      alert("Failed to fetch assignment status ❌");
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      stopSound(); // stop sound when interacted
      await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.log("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      stopSound(); // stop sound when interacted
      const storedUser = JSON.parse(localStorage.getItem("user"));
      await axios.put(`http://localhost:5000/api/notifications/student/${storedUser.id}/read-all`);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.log("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTabAssignments = () => {
    let filtered = assignments;
    if (activeTab === "Pending") filtered = assignments.filter(a => !submittedAssignments[a._id] && !isOverdue(a.dueDate));
    if (activeTab === "Submitted") filtered = assignments.filter(a => submittedAssignments[a._id]);
    if (activeTab === "Overdue") filtered = assignments.filter(a => !submittedAssignments[a._id] && isOverdue(a.dueDate));
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(a => 
        a.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const tabAssignments = getTabAssignments();

  if (user?.role === "staff") {
    return (

        <div className="student-bg">
    
          {/* TOP BAR */}
          <div className="top-bar">
    
            {/* NOTIFICATIONS BELL */}
            {user?.role === "student" && (
              <div className="notification-bell-container" ref={notificationRef}>
                <div 
                  className="notification-bell" 
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </div>
    
                {showNotifications && (
                  <div className={`notification-popup ${theme}`}>
                    <div className="notification-header">
                      <h4>Notifications</h4>
                      {unreadCount > 0 && (
                        <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <hr className="divider" />
                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <p className="no-notifications">You have no notifications.</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n._id} 
                            className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                            onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                          >
                             <div className="notification-icon">
                                {!n.isRead && <div className="unread-dot"></div>}
                                <span>📢</span>
                             </div>
                             <div className="notification-content">
                                <p>{n.message}</p>
                                <small>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
    
            <div className="profile" ref={profileRef} onClick={() => setShowProfile(!showProfile)}>
    
              {user?.profilePic ? (
                <img src={user.profilePic} alt="profile" />
              ) : (
                <div className="avatar">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
    
              {showProfile && (
                <div className={`profile-popup ${theme}`}>
                  <div className="profile-header">
                    {user?.profilePic ? (
                      <img src={user.profilePic} alt="profile" className="popup-avatar-img" />
                    ) : (
                      <div className="popup-avatar">
                        {user?.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="profile-info">
                      <h4>{user?.name}</h4>
                      <p>{user?.email}</p>
                      {user?.role === "staff" ? (
                        <small>Role: Teaching Staff</small>
                      ) : (
                        <>
                          <small>{user?.year} - {user?.department}</small>
                          <br />
                          <small>Reg No: {user?.registerNumber || "Not Provided"}</small>
                        </>
                      )}
                    </div>
                  </div>
    
                  <hr className="divider" />
    
                  <div className="menu-items">
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
                      {soundEnabled ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                      )}
                      <span>Sound Alerts: {soundEnabled ? "ON" : "OFF"}</span>
                    </button>
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); toggleTheme(); }}>
                      {theme === "light" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                      )}
                      <span>{theme === "light" ? "Dark Theme" : "Light Theme"}</span>
                    </button>
                  </div>
    
                  <hr className="divider" />
    
                  <button className="menu-btn logout" onClick={handleLogout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
    
          {/* HEADER */}
          <div className="student-header">
            <h1>{user?.role === "staff" ? "Class Assignments Overview" : "Student Dashboard"}</h1>
            <div className="header-actions">
              {user?.role === "staff" ? (
                <div className="staff-filters">
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="filter-select">
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                  <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="filter-select">
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
              ) : (
                <div className="year-badge">
                  {user?.year} - {user?.department}
                </div>
              )}
              {user?.role === "staff" && (
                <button 
                  className="premium-upload-btn"
                  onClick={() => window.location.href = "/staff"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Upload New Assignment
                </button>
              )}
            </div>
          </div>
    
          {/* STATS BAR for Students */}
          {user?.role === "student" && (
            <div className="stats-bar">
              {/* TOTAL */}
              <div className="stat-card stat-total">
                <div className="stat-icon-wrapper total-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Assignments</div>
                  <div className="stat-number">{assignments.length}</div>
                </div>
              </div>
              
              {/* COMPLETED */}
              <div className="stat-card stat-completed">
                <div className="stat-icon-wrapper completed-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Completed</div>
                  <div className="stat-number">
                    {assignments.filter(a => submittedAssignments[a._id]).length}
                  </div>
                </div>
              </div>
              
              {/* PENDING */}
              <div className="stat-card stat-pending">
                <div className="stat-icon-wrapper pending-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Pending</div>
                  <div className="stat-number">
                    {assignments.length - assignments.filter(a => submittedAssignments[a._id]).length}
                  </div>
                </div>
              </div>
            </div>
          )}
    
          {/* GRID */}
          <div className="assignment-grid">
            {assignments.length === 0 ? (
              <div className="no-data-container">
                <span className="no-data-icon">📭</span>
                <p className="no-data">You have no assignments at the moment!</p>
              </div>
            ) : (
              assignments.map((a) => {
                const isSubmitted = submittedAssignments[a._id];
                const isStaff = user?.role === "staff";
    
                return (
                  <div
                    key={a._id}
                    className={`assignment-card ${isOverdue(a.dueDate) ? "overdue-card" : ""} ${isSubmitted ? "submitted-card" : ""}`}
                  >
                    <div className="card-header">
                      <h3 className="assignment-title">{a.subjectName}</h3>
                      {!isStaff && (
                        <span className={`status-badge ${isSubmitted ? "completed" : isOverdue(a.dueDate) ? "overdue" : "pending"}`}>
                          {isSubmitted ? "Completed" : isOverdue(a.dueDate) ? "Overdue" : "Pending"}
                        </span>
                      )}
                      {isStaff && isOverdue(a.dueDate) && (
                        <span className="status-badge overdue">Closed</span>
                      )}
                      {isStaff && !isOverdue(a.dueDate) && (
                        <span className="status-badge pending">Active</span>
                      )}
                    </div>
    
                    <div className="card-body">
                      <div className="info-row">
                        <span className="icon">📝</span>
                        <span><b>Assign No:</b> {a.assignmentNumber}</span>
                      </div>
                      <div className="info-row">
                        <span className="icon">👨‍🏫</span>
                        <span><b>Staff:</b> {a.staffName || "N/A"}</span>
                      </div>
                      <div className="info-row">
                        <span className="icon">📅</span>
                        <span className={isOverdue(a.dueDate) && !isSubmitted && !isStaff ? "text-overdue" : ""}>
                          <b>Due:</b> {new Date(a.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
    
                    {/* LINKS */}
                    <div className="assignment-links">
                      {a.fileUrl && (
                        <a
                          href={`http://localhost:5000/${a.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn icon-btn view-btn"
                        >
                          📄 View Doc
                        </a>
                      )}
                      {a.link && (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn icon-btn link-btn"
                        >
                          🔗 Open Link
                        </a>
                      )}
                    </div>
    
                    <hr className="card-divider" />
    
                    {/* ACTION FOOTER */}
                    <div className="card-footer">
                      {isStaff ? (
                        <div className="submit-section">
                          <button 
                            onClick={() => handleViewStatus(a)} 
                            className="btn submit-btn pulse"
                            style={{ width: "100%", background: "var(--accent-primary)" }}
                          >
                           View Status
                          </button>
                        </div>
                      ) : isSubmitted ? (
                        <div className="success-message">
                          <span className="check-icon">✓</span> Successfully Submitted
                        </div>
                      ) : isOverdue(a.dueDate) ? (
                        <div className="overdue-message">
                          <span className="cross-icon">✕</span> Submission Closed
                        </div>
                      ) : (
                        <div className="submit-section">
                          {a.link ? (
                            <button
                              onClick={() => handleMarkSubmitted(a._id)}
                              className="btn submit-btn pulse"
                            >
                              Mark as Done
                            </button>
                          ) : (
                            <div className="file-upload-wrapper">
                              <input
                                type="file"
                                id={`file-${a._id}`}
                                className="hidden-file-input"
                                onChange={(e) =>
                                  handleFileChange(a._id, e.target.files[0])
                                }
                              />
                              <label htmlFor={`file-${a._id}`} className={`btn file-label ${files[a._id] ? 'has-file' : ''}`}>
                                {files[a._id] ? (
                                  <><span className="truncate">📎 {files[a._id].name}</span></>
                                ) : (
                                  <>Choose a file</>
                                )}
                              </label>
                              <button
                                onClick={() => handleSubmitAssignment(a._id)}
                                className={`btn submit-btn ${!files[a._id] ? 'disabled' : ''}`}
                                disabled={!files[a._id]}
                              >
                                Submit
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
    
          {/* STAFF STATUS MODAL */}
          {statusModalOpen && (
            <div className="status-modal-overlay" onClick={() => setStatusModalOpen(false)}>
              <div className={`status-modal ${theme}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Submission Status</h3>
                  <p>{selectedAssignmentName}</p>
                  <button className="close-btn" onClick={() => setStatusModalOpen(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {statusData.length === 0 ? (
                    <p>No students found for this year/department.</p>
                  ) : (
                    <table className="status-table">
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
                                <span className="status-pill completed">Submitted</span>
                              ) : (
                                <span className="status-pill pending">Not Submitted</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
    
        </div>
      );
    
  }

  // Student New Render
  return (
    <div className="dashboard-container">
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* SIDEBAR */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">📝</span>
          <h2>AssignTrack</h2>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveNav('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="nav-icon">🏠</span>
            Dashboard
          </button>
          <button className={`nav-item ${activeNav === 'assignments' ? 'active' : ''}`} onClick={() => { setActiveNav('assignments'); myAssignmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
            <span className="nav-icon">📋</span>
            My Assignments
          </button>
          <button className={`nav-item ${activeNav === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveNav('notifications'); setShowNotifications(!showNotifications); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="nav-icon">🔔</span>
            Notifications
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </button>
          <button className={`nav-item ${activeNav === 'calendar' ? 'active' : ''}`} onClick={() => { setActiveNav('calendar'); setShowCalendar(true); }}>
            <span className="nav-icon">📅</span>
            Calendar
          </button>
          <button className={`nav-item ${activeNav === 'resources' ? 'active' : ''}`} onClick={() => setActiveNav('resources')}>
            <span className="nav-icon">📁</span>
            Resources
          </button>
          <button className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`} onClick={() => { setActiveNav('profile'); setShowProfile(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="nav-icon">👤</span>
            Profile
          </button>
          <button className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}>
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={handleLogout}>
            <span className="nav-icon">⏻</span>
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-panel">
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div className="nav-left">
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search assignments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="nav-right">
            <div className="notification-bell-container" ref={notificationRef}>
              <button className="icon-btn bell-btn" onClick={() => setShowNotifications(!showNotifications)}>
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="notification-popup">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>Mark all as read</button>}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="no-notifications">No notifications.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`notification-item ${!n.isRead ? 'unread' : ''}`} onClick={() => !n.isRead && handleMarkAsRead(n._id)}>
                           <div className="notification-icon">
                              {!n.isRead && <div className="unread-dot"></div>}
                              <span>📢</span>
                           </div>
                           <div className="notification-content">
                              <p>{n.message}</p>
                              <small>{new Date(n.createdAt).toLocaleDateString()}</small>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="user-profile-nav" ref={profileRef} onClick={() => setShowProfile(!showProfile)}>
              {user?.profilePic ? (
                <img src={user.profilePic} alt="profile" className="nav-avatar-img" />
              ) : (
                <div className="nav-avatar">{user?.email?.charAt(0).toUpperCase() || "P"}</div>
              )}
              <div className="nav-user-info">
                <span className="nav-user-name">{user?.name || "Priya R"}</span>
                <span className="nav-user-role">Student</span>
              </div>
              <span className="nav-dropdown-icon">▼</span>

              {showProfile && (
                <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="profile-header" style={{ padding: '24px 20px', gap: '16px' }}>
                    <div className="popup-avatar" style={{ width: '64px', height: '64px', fontSize: '28px' }}>
                      {user?.profilePic ? (
                        <img src={user.profilePic} alt="profile" className="popup-avatar-img" style={{ width: '64px', height: '64px' }} />
                      ) : (
                        <span>{user?.name?.charAt(0).toUpperCase() || "P"}</span>
                      )}
                    </div>
                    <div className="profile-info">
                      <h4 style={{ fontSize: '18px', color: '#0f172a' }}>{user?.name || "Ponnarasi A"}</h4>
                      <p style={{ color: '#475569', marginBottom: '6px' }}>{user?.email || "ponnarasishivani02@gmail.com"}</p>
                      <small style={{ display: 'block', color: '#64748b' }}>{user?.year || "3rd Year"} - {user?.department || "IT"}</small>
                      <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>Reg No: {user?.registerNumber || "71052307031"}</small>
                    </div>
                  </div>
                  <hr className="divider" style={{ margin: '0' }} />
                  <div className="menu-items" style={{ padding: '12px' }}>
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
                      <span className="menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      </span>
                      Sound Alerts: {soundEnabled ? "ON" : "OFF"}
                    </button>
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); toggleTheme(); }}>
                      <span className="menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        {theme === "light" ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        )}
                      </span>
                      {theme === "light" ? "Dark Theme" : "Light Theme"}
                    </button>
                  </div>
                  <hr className="divider" style={{ margin: '0' }} />
                  <div className="menu-items" style={{ padding: '12px' }}>
                    <button className="menu-btn logout" onClick={handleLogout}>
                      <span className="menu-icon" style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      </span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeNav === 'settings' ? (
          <div className="settings-page-container">
            <div className="settings-header-top">
              <h2>Settings</h2>
              <p>Manage your account and preferences</p>
            </div>
            
            <div className="settings-layout">
              {/* Settings Sidebar */}
              <div className="settings-sidebar">
                {['Profile Settings', 'Notification Settings', 'Password & Security', 'Dashboard Preferences', 'Theme Settings', 'Help & Support', 'About'].map(tab => (
                  <button 
                    key={tab}
                    className={`settings-tab-btn ${activeSettingsTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab(tab)}
                  >
                    <span className="icon">
                      {tab === 'Profile Settings' && '👤'}
                      {tab === 'Notification Settings' && '🔔'}
                      {tab === 'Password & Security' && '🔒'}
                      {tab === 'Dashboard Preferences' && '🎛️'}
                      {tab === 'Theme Settings' && '🎨'}
                      {tab === 'Help & Support' && '❓'}
                      {tab === 'About' && 'ℹ️'}
                    </span>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Settings Content */}
              <div className="settings-content-area">
                {activeSettingsTab === 'Profile Settings' && (
                  <>
                    <div className="settings-card">
                      <h3 className="settings-card-title">Profile Settings</h3>
                      
                      <div className="settings-profile-pic-section">
                        <div className="settings-label">Profile Picture</div>
                        <div className="profile-pic-flex">
                          <div className="settings-avatar-large">
                            {user?.profilePic ? (
                              <img src={user.profilePic} alt="profile" />
                            ) : (
                              <span className="default-avatar-text">{user?.name?.charAt(0).toUpperCase() || "P"}</span>
                            )}
                          </div>
                          <div className="profile-pic-actions">
                            <p className="upload-hint">JPG, PNG or GIF. Max size of 2MB</p>
                            <button className="settings-outline-btn">
                              <span className="icon">↑</span> Change Photo
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="settings-form-grid">
                        <div className="settings-input-group">
                          <label>Full Name</label>
                          <input type="text" name="name" value={profileFormData.name} onChange={handleProfileChange} />
                        </div>
                        <div className="settings-input-group">
                          <label>Email Address</label>
                          <input type="email" name="email" value={profileFormData.email} onChange={handleProfileChange} />
                        </div>
                        <div className="settings-input-group">
                          <label>Roll Number</label>
                          <input type="text" name="registerNumber" value={profileFormData.registerNumber} onChange={handleProfileChange} />
                        </div>
                        <div className="settings-input-group">
                          <label>Department</label>
                          <select name="department" value={profileFormData.department} onChange={handleProfileChange}>
                            <option value="">Select Department</option>
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                          </select>
                        </div>
                        <div className="settings-input-group">
                          <label>Phone Number</label>
                          <input type="tel" name="phone" value={profileFormData.phone} onChange={handleProfileChange} />
                        </div>
                        <div className="settings-input-group">
                          <label>Language</label>
                          <select name="language" value={profileFormData.language} onChange={handleProfileChange}>
                            <option value="English">English</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Hindi">Hindi</option>
                          </select>
                        </div>
                      </div>

                      <div className="settings-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                           {profileSaveStatus.message && (
                             <span style={{ color: profileSaveStatus.status === 'error' ? '#ef4444' : '#10b981', fontSize: '14px', fontWeight: '500' }}>
                               {profileSaveStatus.message}
                             </span>
                           )}
                        </div>
                        <button 
                           className="settings-primary-btn" 
                           onClick={handleProfileSave}
                           disabled={profileSaveStatus.status === 'loading'}
                           style={{ opacity: profileSaveStatus.status === 'loading' ? 0.7 : 1 }}
                        >
                           {profileSaveStatus.status === 'loading' ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>

                    <div className="settings-card quick-actions-card">
                      <h3 className="settings-card-title">Quick Account Actions</h3>
                      <div className="settings-quick-actions-grid">
                        <div className="quick-action-card green">
                          <div className="quick-action-icon">👤</div>
                          <h4>Update Profile</h4>
                          <p>Update your personal information</p>
                        </div>
                        <div className="quick-action-card yellow">
                          <div className="quick-action-icon">🔒</div>
                          <h4>Change Password</h4>
                          <p>Update your account password</p>
                        </div>
                        <div className="quick-action-card red" onClick={handleLogout}>
                          <div className="quick-action-icon">🚪</div>
                          <h4>Logout All Devices</h4>
                          <p>Sign out from all devices</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {activeSettingsTab !== 'Profile Settings' && (
                  <div className="settings-card empty-state">
                    <h3>{activeSettingsTab}</h3>
                    <p>This section is under development.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* GREETING */}
        <div className="greeting-section">
          <h1>Welcome back, {user?.name?.split(' ')[0] || "Priya"}! 👋</h1>
          <p>Here's what's happening with your assignments.</p>
        </div>

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card-new light-blue">
            <div className="stat-icon blue-bg">📋</div>
            <div className="stat-details">
              <h3>{assignments.length}</h3>
              <p className="stat-title blue-text">Total Assignments</p>
              <p className="stat-desc">All assigned tasks</p>
            </div>
          </div>
          <div className="stat-card-new light-yellow">
            <div className="stat-icon yellow-bg">⏳</div>
            <div className="stat-details">
              <h3>{assignments.length - assignments.filter(a => submittedAssignments[a._id]).length}</h3>
              <p className="stat-title yellow-text">Pending</p>
              <p className="stat-desc">Not submitted yet</p>
            </div>
          </div>
          <div className="stat-card-new light-green">
            <div className="stat-icon green-bg">✓</div>
            <div className="stat-details">
              <h3>{assignments.filter(a => submittedAssignments[a._id]).length}</h3>
              <p className="stat-title green-text">Submitted</p>
              <p className="stat-desc">Completed tasks</p>
            </div>
          </div>
          <div className="stat-card-new light-red">
            <div className="stat-icon red-bg">!</div>
            <div className="stat-details">
              <h3>{assignments.filter(a => !submittedAssignments[a._id] && isOverdue(a.dueDate)).length}</h3>
              <p className="stat-title red-text">Overdue</p>
              <p className="stat-desc">Past due date</p>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="dashboard-grid">
          {/* LEFT: MY ASSIGNMENTS */}
          <div className="grid-left" ref={myAssignmentsRef}>
            <div className="assignments-panel">
              <div className="panel-header">
                <h2>My Assignments</h2>
                <button className="view-all-link">View All</button>
              </div>
              <div className="panel-tabs">
                {['All', 'Pending', 'Submitted', 'Overdue'].map(tab => (
                  <button 
                    key={tab}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="assignments-list">
                {tabAssignments.length === 0 ? (
                  <p className="no-data-msg">No assignments in this category.</p>
                ) : (
                  tabAssignments.map((a, index) => {
                    const isSub = submittedAssignments[a._id];
                    const isOver = isOverdue(a.dueDate);
                    const statusText = isSub ? "Submitted" : isOver ? "Overdue" : "Pending";
                    const statusClass = statusText.toLowerCase();

                    // determine icon and bg based on subject or index
                    const iconColors = [
                      {bg: '#f3e8ff', color: '#9333ea', icon: '🗄️'},
                      {bg: '#dcfce7', color: '#16a34a', icon: '💻'},
                      {bg: '#e0f2fe', color: '#0284c7', icon: '📊'},
                      {bg: '#fee2e2', color: '#dc2626', icon: '📕'},
                      {bg: '#fef3c7', color: '#d97706', icon: '📈'}
                    ];
                    const theme = iconColors[index % iconColors.length];

                    return (
                      <div className={`assignment-list-item bg-${statusClass}`} key={a._id} onClick={() => setSelectedAssignment(a)}>
                        <div className="item-icon-wrapper" style={{ backgroundColor: theme.bg }}>
                           <span className="item-icon">{theme.icon}</span>
                        </div>
                        <div className="item-info">
                          <h4>{a.subjectName}</h4>
                          {a.description && <p className="item-desc">{a.description}</p>}
                          <div className="item-meta">
                            <span className="due-date">📅 Due: {new Date(a.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                          </div>
                        </div>
                        <div className="item-actions">
                          <span className={`status-pill new-${statusClass}`}>{statusText}</span>
                          {isSub && <p className="sub-date-text">Submitted</p>}
                          {isOver && !isSub && <p className="sub-date-text">Overdue</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: NOTIFICATIONS & QUICK ACTIONS */}
          <div className="grid-right">
            
            {/* NOTIFICATIONS WIDGET */}
            <div className="widget-panel">
              <div className="panel-header">
                <h2>Notifications</h2>
                <button className="view-all-link" onClick={handleMarkAllAsRead}>Mark all as read</button>
              </div>
              <div className="widget-list">
                 {notifications.slice(0, 3).map(n => (
                   <div className="widget-item" key={n._id}>
                     <div className={`widget-icon ${n.isRead ? '' : 'unread'}`}>
                       📋
                     </div>
                     <div className="widget-info">
                       <h4>{n.type === 'NEW_ASSIGNMENT' ? 'New Assignment Posted' : n.type === 'DUE_SOON' ? 'Assignment Due Tomorrow' : 'Assignment Overdue'}</h4>
                       <p>{n.message}</p>
                       <small>{new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</small>
                     </div>
                     {!n.isRead && <div className="unread-dot-mini"></div>}
                   </div>
                 ))}
                 {notifications.length === 0 && <p className="no-data-msg">No new notifications.</p>}
                 {notifications.length > 0 && <button className="view-all-link center-link" onClick={() => setShowNotifications(true)}>View all notifications</button>}
              </div>
            </div>

            {/* QUICK ACTIONS WIDGET */}
            <div className="widget-panel">
              <div className="panel-header">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-actions-grid">
                <button className="action-btn">
                  <div className="action-icon bg-blue">📤</div>
                  <span>Upload<br/>Submission</span>
                </button>
                <button className="action-btn">
                  <div className="action-icon bg-green">📅</div>
                  <span>View<br/>Calendar</span>
                </button>
                <button className="action-btn">
                  <div className="action-icon bg-purple">🗂️</div>
                  <span>Study<br/>Materials</span>
                </button>
                <button className="action-btn">
                  <div className="action-icon bg-red">❓</div>
                  <span>Get<br/>Help</span>
                </button>
              </div>
            </div>

          </div>
        </div>
        </>
        )}
      </div>

      {/* CALENDAR MODAL */}
      {showCalendar && (
        <div className="assignment-modal-overlay" onClick={() => setShowCalendar(false)}>
          <div className="assignment-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header-flex">
              <h2>📅 Academic Calendar</h2>
            </div>
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                 <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                  {Array.from({length: 30}).map((_, i) => (
                    <div key={i} style={{ 
                        padding: '10px', 
                        background: (i+1 === new Date().getDate()) ? '#3b82f6' : '#f8fafc', 
                        color: (i+1 === new Date().getDate()) ? 'white' : '#475569',
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                      {i + 1}
                    </div>
                  ))}
               </div>
            </div>
            <hr className="modal-divider" />
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '15px' }}>
              Upcoming: <b style={{color: '#dc2626'}}>{assignments.filter(a => !submittedAssignments[a._id] && !isOverdue(a.dueDate)).length} Pending Assignments</b>
            </div>
            <button className="modal-close-btn" onClick={() => setShowCalendar(false)}>✕</button>
          </div>
        </div>
      )}

      {/* ASSIGNMENT MODAL */}
      {selectedAssignment && (
        <div className="assignment-modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="assignment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h2>
                {selectedAssignment.subjectName}
              </h2>
              <span className={`status-pill new-${submittedAssignments[selectedAssignment._id] ? 'submitted' : isOverdue(selectedAssignment.dueDate) ? 'overdue' : 'pending'}`} style={{ alignSelf: 'flex-start' }}>
                {submittedAssignments[selectedAssignment._id] ? 'COMPLETED' : isOverdue(selectedAssignment.dueDate) ? 'OVERDUE' : 'PENDING'}
              </span>
            </div>
            
            <div className="modal-details">
              <div className="detail-row">
                <span className="icon">📝</span>
                <span><b>Assign No:</b> {selectedAssignment.assignmentNumber || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="icon">👨‍🏫</span>
                <span><b>Staff:</b> {selectedAssignment.staffName || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="icon">📅</span>
                <span><b>Due:</b> {new Date(selectedAssignment.dueDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {selectedAssignment.fileUrl && (
              <a
                href={`http://localhost:5000/${selectedAssignment.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="btn view-doc-btn"
              >
                📄 View Doc
              </a>
            )}

            <hr className="modal-divider" />

            <div className="modal-footer-actions">
              {submittedAssignments[selectedAssignment._id] ? (
                <div className="success-banner">
                  ✓ Successfully Submitted
                </div>
              ) : isOverdue(selectedAssignment.dueDate) ? (
                <div className="overdue-banner">
                  ✕ Submission Closed
                </div>
              ) : (
                <div className="submit-actions-container">
                  {selectedAssignment.link ? (
                    <button
                      onClick={() => {
                         handleMarkSubmitted(selectedAssignment._id);
                         setSelectedAssignment(null);
                      }}
                      className="btn submit-btn pulse"
                      style={{ width: '100%' }}
                    >
                      Mark as Done
                    </button>
                  ) : (
                    <div className="file-upload-wrapper" style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="file"
                        id={`modal-file-${selectedAssignment._id}`}
                        className="hidden-file-input"
                        onChange={(e) =>
                          handleFileChange(selectedAssignment._id, e.target.files[0])
                        }
                      />
                      <label htmlFor={`modal-file-${selectedAssignment._id}`} className={`btn file-label ${files[selectedAssignment._id] ? 'has-file' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                        {files[selectedAssignment._id] ? (
                          <span className="truncate">📎 {files[selectedAssignment._id].name}</span>
                        ) : (
                          "Upload file"
                        )}
                      </label>
                      <button
                        onClick={() => {
                           handleSubmitAssignment(selectedAssignment._id);
                           setSelectedAssignment(null);
                        }}
                        className={`btn submit-btn ${!files[selectedAssignment._id] ? 'disabled' : ''}`}
                        disabled={!files[selectedAssignment._id]}
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button className="modal-close-btn" onClick={() => setSelectedAssignment(null)}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default StudentDashboard;
