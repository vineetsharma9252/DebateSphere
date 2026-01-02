import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';

const SERVER_URL = 'https://debatesphere-11.onrender.com';

export default function DebateResults() {
  const route = useRoute();
  const navigation = useNavigation();
  const { roomId, winner, scores, leaderboard } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [debateDetails, setDebateDetails] = useState(null);
  const [detailedResults, setDetailedResults] = useState(null);

  useEffect(() => {
    fetchDebateResults();
  }, [roomId]);

  const fetchDebateResults = async () => {
    try {
      setLoading(true);

      // Try to get detailed results from server
      const response = await axios.get(`${SERVER_URL}/api/debate/${roomId}/results`);

      if (response.data.success) {
        setDetailedResults(response.data);
        setDebateDetails({
          roomId,
          winner: response.data.winner?.team || winner,
          scores: response.data.scores || scores,
          awards: response.data.awards
        });
      }
    } catch (error) {
      console.error('Error fetching detailed results:', error);
      // Use passed data as fallback
      setDebateDetails({
        roomId,
        winner,
        scores,
        leaderboard
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  if (!debateDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No results available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#667eea" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Debate Results</Text>
        <Text style={styles.headerSubtitle}>Room: {roomId?.substring(0, 15)}...</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Winner Section */}
        <View style={styles.winnerCard}>
          <Text style={styles.winnerTitle}>Final Winner</Text>
          <View style={[
            styles.winnerBadge,
            { backgroundColor: getTeamColor(debateDetails.winner) }
          ]}>
            <Text style={styles.winnerText}>
              {getTeamLabel(debateDetails.winner)}
            </Text>
          </View>
        </View>

        {/* Team Scores */}
        <View style={styles.scoresCard}>
          <Text style={styles.sectionTitle}>Team Scores</Text>

          {['favor', 'against', 'neutral'].map(team => (
            <View key={team} style={styles.teamScoreRow}>
              <View style={styles.teamLabel}>
                <Text style={styles.teamEmoji}>
                  {team === 'favor' ? '👍' : team === 'against' ? '👎' : '🤝'}
                </Text>
                <Text style={styles.teamName}>{getTeamLabel(team)}</Text>
                {debateDetails.winner === team && (
                  <Text style={styles.winnerCrown}>👑</Text>
                )}
              </View>

              <View style={styles.teamStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg Score</Text>
                  <Text style={styles.statValue}>
                    {debateDetails.scores?.[team]?.average?.toFixed(1) || '0.0'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Arguments</Text>
                  <Text style={styles.statValue}>
                    {debateDetails.scores?.[team]?.count || 0}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Participants</Text>
                  <Text style={styles.statValue}>
                    {debateDetails.scores?.[team]?.participants || 0}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Awards Section */}
        {detailedResults?.awards && (
          <View style={styles.awardsCard}>
            <Text style={styles.sectionTitle}>🏅 Awards</Text>

            {detailedResults.awards.bestArgument && (
              <View style={styles.awardItem}>
                <Text style={styles.awardTitle}>Best Argument</Text>
                <Text style={styles.awardWinner}>
                  {detailedResults.awards.bestArgument.username}
                </Text>
                <Text style={styles.awardScore}>
                  Score: {detailedResults.awards.bestArgument.score} points
                </Text>
                <Text style={styles.awardExcerpt}>
                  "{detailedResults.awards.bestArgument.argumentExcerpt}"
                </Text>
              </View>
            )}

            {detailedResults.awards.mostPersuasive && (
              <View style={styles.awardItem}>
                <Text style={styles.awardTitle}>Most Persuasive</Text>
                <Text style={styles.awardWinner}>
                  {detailedResults.awards.mostPersuasive.username}
                </Text>
                <Text style={styles.awardScore}>
                  Score: {detailedResults.awards.mostPersuasive.score} points
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Top Participants */}
        {leaderboard && leaderboard.length > 0 && (
          <View style={styles.leaderboardCard}>
            <Text style={styles.sectionTitle}>🎯 Top Performers</Text>

            {leaderboard.slice(0, 5).map((player, index) => (
              <View key={index} style={styles.leaderboardRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.username}</Text>
                  <Text style={styles.playerDetails}>
                    {player.argumentCount} arguments • {player.averageScore.toFixed(1)} avg
                  </Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{player.totalScore}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.actionButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={fetchDebateResults}
          >
            <Text style={styles.secondaryButtonText}>Refresh Results</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper functions
const getTeamLabel = (team) => {
  switch (team) {
    case 'favor': return 'In Favor';
    case 'against': return 'Against';
    case 'neutral': return 'Neutral';
    default: return 'Undecided';
  }
};

const getTeamColor = (team) => {
  switch (team) {
    case 'favor': return '#10b981';
    case 'against': return '#ef4444';
    case 'neutral': return '#6b7280';
    default: return '#94a3b8';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  winnerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  winnerTitle: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 16,
  },
  winnerBadge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scoresCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  teamScoreRow: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  teamLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  winnerCrown: {
    fontSize: 18,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  awardsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  awardItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  awardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  awardWinner: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  awardScore: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  awardExcerpt: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    fontFamily: 'serif',
    lineHeight: 20,
  },
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rankBadge: {
    backgroundColor: '#f1f5f9',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  playerDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  scoreBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});