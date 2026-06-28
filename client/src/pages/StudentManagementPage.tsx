import React, { useState, useEffect } from "react";
import { studentApi } from "../api";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

interface Student {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  department: string | null;
  student_id: string | null;
  phone_number: string | null;
  verified: boolean;
  status?: string;
}

const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Form states
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'delete'>('manage');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [createFormData, setCreateFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    department: "",
    student_id: "",
    phone_number: ""
  });

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.getAllStudents();
      setStudents(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Create student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.createStudent(createFormData);
      setSuccess(response.data.message);
      setActiveTab('manage');
      setCreateFormData({
        username: "",
        password: "",
        name: "",
        email: "",
        department: "",
        student_id: "",
        phone_number: ""
      });
      fetchStudents(); // Refresh list
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create student");
    } finally {
      setLoading(false);
    }
  };

  // Approve student
  const handleApproveStudent = async (studentId: number) => {
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.approveStudent(studentId);
      setSuccess(response.data.message);
      fetchStudents(); // Refresh list
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to approve student");
    } finally {
      setLoading(false);
    }
  };

  // Reject student
  const handleRejectStudent = async (studentId: number) => {
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.rejectStudent(studentId);
      setSuccess(response.data.message);
      fetchStudents(); // Refresh list
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reject student");
    } finally {
      setLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await studentApi.deleteStudent(studentId);
      setSuccess(response.data.message);
      fetchStudents(); // Refresh list
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete student");
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="student-management-page">
      <style>{`
        .student-management-page {
          background: #0f172a;
          color: #f9fafb;
          min-height: 100vh;
          padding: 24px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
        }
        .back-btn {
          background: #1e293b;
          color: #f9fafb;
          border: none;
          padding: 10px 20px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #334155;
          transform: translateY(-1px);
        }
        .student-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .student-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .create-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .create-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .error {
          background: rgba(239, 68, 68, 0.15);
          color: #fecaca;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .success {
          background: rgba(16, 185, 129, 0.15);
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .students-table-container {
          background: #0f172a;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
        }
        .students-table {
          width: 100%;
          border-collapse: collapse;
          background: #020617;
          border-radius: 12px;
          overflow: hidden;
        }
        .students-table th,
        .students-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid #1e293b;
        }
        .students-table th {
          background: #1e293b;
          font-weight: 600;
          color: #cbd5e1;
        }
        .students-table tr:last-child td {
          border-bottom: none;
        }
        .students-table tr:hover {
          background: rgba(30, 41, 59, 0.5);
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-verified {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .status-pending {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }
        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 8px;
        }
        .approve-btn {
          background: #10b981;
          color: white;
        }
        .reject-btn {
          background: #ef4444;
          color: white;
        }
        .delete-btn {
            background: #ef4444;
            color: white;
        }
        .action-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #0f172a;
          padding: 24px;
          border-radius: 18px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #cbd5e1;
        }
        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #1e293b;
          background: #020617;
          color: #f9fafb;
          font-size: 14px;
          transition: all 0.2s ease;
          box-sizing: border-box;
          caret-color: #10b981;
        }
        .form-group input:focus {
          outline: none;
          border-color: #10b981;
          background: #0f172a;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        /* Fix for invisible text during browser autofill */
        .form-group input:-webkit-autofill,
        .form-group input:-webkit-autofill:hover,
        .form-group input:-webkit-autofill:focus,
        .form-group input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #020617 inset !important;
          -webkit-text-fill-color: #f9fafb !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .form-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-btn {
          background: #10b981;
          color: white;
        }
        .cancel-btn {
          background: #1e293b;
          color: #f9fafb;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #94a3b8;
        }
        .tab-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .tab-btn {
          padding: 10px 20px;
          border: 1px solid #1e293b;
          background: #0f172a;
          color: #cbd5e1;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-weight: 600;
        }
        .tab-btn.active-tab {
          background: #1e293b;
          color: #f9fafb;
          border-bottom: 1px solid transparent;
        }
        .manage-students-view {
          /* Nothing needed here */
        }
        .create-student-view {
          background: #020617;
          padding: 24px;
          border-radius: 12px;
        }
        .filter-controls {
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .department-filter-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #1e293b;
          background: #020617;
          color: #f9fafb;
          font-size: 14px;
        }
      `}</style>

      <div className="page-header">
        <h1>Student Management</h1>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="students-table-container">
        <div className="student-header">
          <h2>Student Management</h2>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {loading && <div className="loading">Loading...</div>}

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'manage' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Verify Students
          </button>
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Student
          </button>
          <button
            className={`tab-btn ${activeTab === 'delete' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            Delete Student
          </button>
        </div>

        {activeTab === 'manage' && (
          <div className="manage-students-view">
            {/* Department Filter */}
            <div className="filter-controls">
              <label htmlFor="department-filter">Filter by Department: </label>
              <select
                id="department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="department-filter-select"
              >
                <option value="all">All Departments</option>
                {Array.from(new Set(students.map(s => s.department).filter(d => d !== null && d !== undefined && d.trim() !== ''))).map(dept => (
                  <option key={dept} value={dept || ''}>{dept}</option>
                ))}
              </select>
            </div>

            {!loading && (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Student ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(student =>
                      departmentFilter === 'all' ||
                      (student.department && student.department.toLowerCase().includes(departmentFilter.toLowerCase()))
                    )
                    .map((student) => (
                      <tr key={student.id}>
                        <td>{student.username}</td>
                        <td>{student.name || "-"}</td>
                        <td>{student.email || "-"}</td>
                        <td>{student.department || "-"}</td>
                        <td>{student.student_id || "-"}</td>
                        <td>
                          <span className={`status-badge ${student.status === 'approved' ? "status-verified" : student.status === 'rejected' ? "status-pending" : "status-pending"}`}
                            style={{
                              background: student.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : undefined,
                              color: student.status === 'rejected' ? '#ef4444' : undefined,
                              borderColor: student.status === 'rejected' ? 'rgba(239, 68, 68, 0.4)' : undefined
                            }}>
                            {student.status === 'approved' ? "Verified" : student.status === 'rejected' ? "Rejected" : "Pending"}
                          </span>
                        </td>
                        <td>
                          {student.status !== 'approved' && (
                            <>
                              <button
                                className="action-btn approve-btn"
                                onClick={() => handleApproveStudent(student.id)}
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                className="action-btn reject-btn"
                                onClick={() => handleRejectStudent(student.id)}
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="create-student-view">
            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={createFormData.department}
                  onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Student ID</label>
                <input
                  type="text"
                  value={createFormData.student_id}
                  onChange={(e) => setCreateFormData({ ...createFormData, student_id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={createFormData.phone_number}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone_number: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={() => setActiveTab('manage')}>
                  Cancel
                </button>
                <button type="submit" className="form-btn submit-btn" disabled={loading}>
                  {loading ? "Creating..." : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'delete' && (
          <div className="delete-students-view">
            {/* Department Filter - Reusing logic could be componentized but duplicating for now as per style */}
            <div className="filter-controls">
              <label htmlFor="department-filter-delete">Filter by Department: </label>
              <select
                id="department-filter-delete"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="department-filter-select"
              >
                <option value="all">All Departments</option>
                {Array.from(new Set(students.map(s => s.department).filter(d => d !== null && d !== undefined && d.trim() !== ''))).map(dept => (
                  <option key={dept} value={dept || ''}>{dept}</option>
                ))}
              </select>
            </div>

            {!loading && (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Student ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(student =>
                      departmentFilter === 'all' ||
                      (student.department && student.department.toLowerCase().includes(departmentFilter.toLowerCase()))
                    )
                    .map((student) => (
                      <tr key={student.id}>
                        <td>{student.username}</td>
                        <td>{student.name || "-"}</td>
                        <td>{student.email || "-"}</td>
                        <td>{student.department || "-"}</td>
                        <td>{student.student_id || "-"}</td>
                        <td>
                          <span className={`status-badge ${student.status === 'approved' ? "status-verified" : student.status === 'rejected' ? "status-pending" : "status-pending"}`}
                            style={{
                              background: student.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : undefined,
                              color: student.status === 'rejected' ? '#ef4444' : undefined,
                              borderColor: student.status === 'rejected' ? 'rgba(239, 68, 68, 0.4)' : undefined
                            }}>
                            {student.status === 'approved' ? "Verified" : student.status === 'rejected' ? "Rejected" : "Pending"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={loading}
                            title="Delete Student"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagementPage;