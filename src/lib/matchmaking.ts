import { supabase } from './supabaseClient';

interface MatchmakingUser {
  id: string;
  country: string;
  gender: string;
  interests: string[];
  lobby: string;
  status: 'searching' | 'matched' | 'idle';
  last_active: string;
  match_id?: string;
}

class MatchmakingService {
  private userId: string;
  private searchInterval: NodeJS.Timeout | null = null;
  private onMatchFound: ((matchedUserId: string) => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private matchSubscription: any = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  async startSearching(preferences: {
    country: string;
    gender: string;
    interests: string[];
    lobby: string;
  }) {
    try {
      // First cleanup any existing entries for this user
      await this.cleanup();

      // Start heartbeat to keep user active
      this.startHeartbeat();

      // Update user status to searching with a unique match ID
      const matchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { error: upsertError } = await supabase.from('matchmaking').upsert({
        id: this.userId,
        ...preferences,
        status: 'searching',
        last_active: new Date().toISOString(),
        match_id: matchId
      });

      if (upsertError) {
        console.error('Error upserting matchmaking entry:', upsertError);
        throw upsertError;
      }

      // Subscribe to match status changes
      await this.subscribeToMatches();

      // Start polling for matches
      this.searchInterval = setInterval(async () => {
        try {
          const match = await this.findMatch(preferences);
          if (match) {
            await this.stopSearching();
            if (this.onMatchFound) {
              this.onMatchFound(match.id);
            }
          }
        } catch (error) {
          console.error('Error in search interval:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Error starting search:', error);
      throw error;
    }
  }

  private async startHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Update last_active every 5 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        const { error } = await supabase.from('matchmaking').update({
          last_active: new Date().toISOString()
        }).eq('id', this.userId);

        if (error) {
          console.error('Error updating heartbeat:', error);
        }
      } catch (error) {
        console.error('Error in heartbeat interval:', error);
      }
    }, 5000);
  }

  private async subscribeToMatches() {
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }

    this.matchSubscription = supabase
      .channel('matchmaking_updates')
      .on('UPDATE', (payload: any, context: any, channel: any) => {
        const updatedUser = payload.new as MatchmakingUser;
        if (updatedUser.id === this.userId && updatedUser.status === 'matched') {
          this.handleMatchUpdate(updatedUser);
        }
      })
      .subscribe((status: string) => {
        console.log('Match subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to match updates');
        }
      });
  }

  private async handleMatchUpdate(user: MatchmakingUser) {
    try {
      // Verify the match is still valid
      const { data: matchData } = await supabase
        .from('matchmaking')
        .select('*')
        .eq('match_id', user.match_id)
        .neq('id', this.userId)
        .single();

      if (matchData && matchData.status === 'matched') {
        await this.stopSearching();
        if (this.onMatchFound) {
          this.onMatchFound(matchData.id);
        }
      }
    } catch (error) {
      console.error('Error handling match update:', error);
    }
  }

  private async findMatch(preferences: {
    country: string;
    gender: string;
    interests: string[];
    lobby: string;
  }): Promise<MatchmakingUser | null> {
    try {
      // First check if we're still searching
      const { data: currentUser } = await supabase
        .from('matchmaking')
        .select('status, match_id')
        .eq('id', this.userId)
        .single();

      if (!currentUser || currentUser.status !== 'searching') {
        return null;
      }

      // Find users who are:
      // 1. Currently searching
      // 2. Not the current user
      // 3. Match the preferences
      // 4. Have been active in the last 10 seconds
      const { data: matches, error } = await supabase
        .from('matchmaking')
        .select('*')
        .eq('status', 'searching')
        .neq('id', this.userId)
        .eq('lobby', preferences.lobby)
        .gte('last_active', new Date(Date.now() - 10000).toISOString())
        .order('last_active', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error finding match:', error);
        throw error;
      }

      // If we found a match, update both users' status
      if (matches && matches.length > 0) {
        const match = matches[0] as MatchmakingUser;

        // Double check that the match is still available
        const { data: matchStatus } = await supabase
          .from('matchmaking')
          .select('status, match_id')
          .eq('id', match.id)
          .single();

        if (!matchStatus || matchStatus.status !== 'searching') {
          return null;
        }

        // Update both users to matched status with the same match_id
        const updates = await Promise.all([
          supabase.from('matchmaking').update({ 
            status: 'matched',
            match_id: currentUser.match_id
          }).eq('id', this.userId),
          supabase.from('matchmaking').update({ 
            status: 'matched',
            match_id: currentUser.match_id
          }).eq('id', match.id)
        ]);

        if (updates.some(update => update.error)) {
          console.error('Error updating match status:', updates);
          return null;
        }

        return match;
      }

      return null;
    } catch (error) {
      console.error('Error finding match:', error);
      return null;
    }
  }

  async stopSearching() {
    try {
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      await supabase.from('matchmaking').update({
        status: 'idle',
        match_id: null
      }).eq('id', this.userId);
    } catch (error) {
      console.error('Error stopping search:', error);
      throw error;
    }
  }

  onMatch(callback: (matchedUserId: string) => void) {
    this.onMatchFound = callback;
  }

  async cleanup() {
    try {
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.matchSubscription) {
        this.matchSubscription.unsubscribe();
        this.matchSubscription = null;
      }

      // Delete the matchmaking entry instead of just updating status
      await supabase.from('matchmaking').delete().eq('id', this.userId);
      this.onMatchFound = null;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default MatchmakingService; 