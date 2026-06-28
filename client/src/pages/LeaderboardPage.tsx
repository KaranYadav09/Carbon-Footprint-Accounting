import React, { useState, useEffect } from 'react';
import {
  FiAward,
  FiTarget,
  FiZap,
  FiFilter,
  FiTrendingUp
} from 'react-icons/fi';
import { Crown } from 'lucide-react';
import api from '../api';
import './LeaderboardPage.css';

interface StudentRanking {
  id: string;
  username: string;
  name: string;
  profile_picture?: string;
  co2_reduced: number;
  activities_count: number;
  emissions_logged: number;
  bills_uploaded: number;
  points: number;
  rank: number;
}

type FilterType = 'co2_reduced' | 'points' | 'activities';

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('co2_reduced');
  const [currentUserRank, setCurrentUserRank] = useState<StudentRanking | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/leaderboard', {
        params: { sort_by: filter }
      });

      const rankings = response.data.map((student: StudentRanking, index: number) => ({
        ...student,
        rank: index + 1
      }));

      setLeaderboard(rankings);

      // Get current user's rank
      try {
        const profileRes = await api.get('/api/profile');
        const currentUser = rankings.find((s: StudentRanking) => s.id === profileRes.data.id);
        if (currentUser) {
          setCurrentUserRank(currentUser);
        }
      } catch (error) {
        console.error('Error fetching current user rank:', error);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-regular';
  };

  const getAvatarUrl = (student: StudentRanking) => {
    if (student.profile_picture) return student.profile_picture;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || student.username)}&background=10b981&color=fff&font-family=Outfit`;
  };

  const topThree = leaderboard.slice(0, 3);
  // Reorder for CSS podium layout (2nd, 1st, 3rd)
  const podiumOrder = topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="lb-page-wrapper">
      {/* Visual Header Background (Gradient + Noise/Pattern could be added in CSS) */}
      <div className="lb-hero-bg"></div>

      <div className="lb-container">
        {/* Header Section */}
        <div className="lb-header">
          <div className="lb-header-icon-wrap">
            <TrophyIcon className="lb-header-icon" />
          </div>
          <h1>Eco Warriors Leaderboard</h1>
          <p>Compete, inspire, and lead the campus sustainability movement.</p>
        </div>

        {/* Filter Section */}
        <div className="lb-filters-container">
          <div className="lb-filter-group">
            <span className="lb-filter-label"><FiFilter /> Sort By:</span>
            <div className="lb-filter-buttons">
              <button
                className={`lb-btn ${filter === 'co2_reduced' ? 'active' : ''}`}
                onClick={() => setFilter('co2_reduced')}
              >
                <FiTrendingUp className="icon" /> CO₂ Reduced
              </button>
              <button
                className={`lb-btn ${filter === 'points' ? 'active' : ''}`}
                onClick={() => setFilter('points')}
              >
                <FiZap className="icon" /> Points
              </button>
              <button
                className={`lb-btn ${filter === 'activities' ? 'active' : ''}`}
                onClick={() => setFilter('activities')}
              >
                <FiTarget className="icon" /> Activities
              </button>
            </div>
          </div>
        </div>

        {/* Current User Rank Card */}
        {currentUserRank && (
          <div className="lb-current-user-banner">
            <div className="lb-current-body">
              <div className={`lb-rank-badge ${getRankBadgeClass(currentUserRank.rank)}`}>
                {currentUserRank.rank === 1 ? '🥇' : currentUserRank.rank === 2 ? '🥈' : currentUserRank.rank === 3 ? '🥉' : `#${currentUserRank.rank}`}
              </div>
              <div className="lb-current-details">
                <div className="lb-current-title">Your Current Rank</div>
                <div className="lb-current-stats">
                  <span>🌱 {currentUserRank.co2_reduced.toFixed(2)} kg CO₂</span>
                  <span className="dot">•</span>
                  <span><FiZap /> {currentUserRank.points} pts</span>
                  <span className="dot">•</span>
                  <span><FiTarget /> {currentUserRank.activities_count} activities</span>
                </div>
              </div>
            </div>
            <div className="lb-current-progress">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(5, 100 - (currentUserRank.rank / leaderboard.length) * 100)}%` }}
                ></div>
              </div>
              <div className="progress-text">Top {Math.round((currentUserRank.rank / leaderboard.length) * 100)}% of campus</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="lb-loading">
            <div className="spinner"></div>
            <p>Gathering rankings...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="lb-empty">
            <FiAward size={48} />
            <p>No eco-warriors have emerged yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Podium Section (Top 3) */}
            {topThree.length > 0 && (
              <div className="lb-podium-section">
                {podiumOrder.map((student, _idx) => {
                  const isFirst = student.rank === 1;
                  const medal = isFirst ? '🥇' : student.rank === 2 ? '🥈' : '🥉';
                  return (
                    <div key={student.id} className={`lb-podium-card ${getRankBadgeClass(student.rank)} ${isFirst ? 'first-place' : ''}`}>
                      {isFirst && <Crown className="crown-icon" size={32} color="#fbbf24" />}
                      <div className="lb-podium-avatar-wrap">
                        <img src={getAvatarUrl(student)} alt={student.name} className="lb-podium-avatar" />
                        <div className="lb-podium-medal">{medal}</div>
                      </div>
                      <h3 className="lb-podium-name">{student.name || student.username}</h3>
                      <div className="lb-podium-username">@{student.username}</div>

                      <div className="lb-podium-stat highlight">
                        <span className="val">{filter === 'co2_reduced' ? `${student.co2_reduced.toFixed(1)}kg` : filter === 'points' ? student.points : student.activities_count}</span>
                        <span className="lbl">{filter === 'co2_reduced' ? 'CO₂ Saved' : filter === 'points' ? 'Points' : 'Activities'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List Section (Rank 4+) */}
            {restOfLeaderboard.length > 0 && (
              <div className="lb-table-container">
                <div className="lb-table-header">
                  <div className="col-rank">Rank</div>
                  <div className="col-user">Student</div>
                  <div className="col-stat">🌱 CO₂ Reduced</div>
                  <div className="col-stat"><FiZap /> Points</div>
                  <div className="col-stat"><FiTarget /> Activities</div>
                </div>

                <div className="lb-table-body">
                  {restOfLeaderboard.map((student) => (
                    <div key={student.id} className={`lb-table-row ${currentUserRank?.id === student.id ? 'is-current' : ''}`}>
                      <div className="col-rank">
                        <span className="rank-num">{student.rank}</span>
                      </div>
                      <div className="col-user">
                        <img src={getAvatarUrl(student)} alt={student.name} className="row-avatar" />
                        <div className="row-user-info">
                          <span className="name">{student.name || student.username}</span>
                          <span className="username">@{student.username}</span>
                        </div>
                      </div>
                      <div className="col-stat emphasis">
                        {student.co2_reduced.toFixed(2)} <span className="unit">kg</span>
                      </div>
                      <div className="col-stat">
                        {student.points}
                      </div>
                      <div className="col-stat">
                        {student.activities_count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Custom Trophy Icon for Header
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7c0 6 3 7 6 7s6-1 6-7V2z" />
  </svg>
);

export default LeaderboardPage;
