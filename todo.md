## Tasks
- [X] Remove Stage **(Only Tournament Owner)**
- [X] Show list view matches 
      Create a new filter, next to 'Order by', to display the matches in a list view template or cards (current). 
      The row in the list can be rearranged by dragging and dropping, and the order will be saved in the database. This allows users to customize the order of matches as they prefer, rather than relying on an automatic sorting algorithm.
      The list view match displays the match number (starting from 1) and group position (e.g. A1, B2) instead of seed (e.g. 1, 4). This makes it easier to identify the teams in round robin stages. 
      The Order by filter values are Group, Round and Custom. The option Custom only displays in the list view. In list view When set to "Custom", the matches are displayed in the order defined by the user, while in card view, it defaults to sorting by round. In the list view, when "Custom" is selected, a drag-and-drop interface allows users to rearrange matches as they see fit, and the new order is saved to the database for future reference. This provides flexibility for users to organize matches according to their preferences, rather than being limited to automatic sorting based on rounds or groups.
      
- [x] Fix matches sort by Round. 
      E.g 12 participants, 3 groups (3 rounds):
      Round 1: Matches (A1vsA2, B1vsB2, C1vsC2, A3vsA4, B3vsB4, C3vsC4), 
      Round 2: Matches (A1vsA3, B1vsB3, C1vsC3, A2vsA4, B2vsB4, C2vsC4),
      Round 3: Matches (A1vsA4, B1vsB4, C1vsC4, A2vsA3, B2vsB3, C2vsC3)
- [X] Fix Started/Ended tournament status. It should be based on the start and end date of the tournament, not on the matches. 
- [X] Tournament configuration page to edit title, description, rules, start and end date, logo, etc. Adding new Players and groups management should not be allowed to edit if the tournament has started.
- [X] Autocomplete URL Slug automatically from tournament name.
- [X] Added tournament COMPLETED status in the TournamentView Header when the completedAt field is set.
- [x] Show update score in fullscreen view for mobile
- [ ] Configure tournament matches max score in settings. Update message "Rule: First to 16 points wins. No ties allowed." with the configured max score.
- [ ] Configure global sorting (Wins > Point Diff > Points For > Points Against)
- [ ] pre-configured templates. Mode "Federacion". 
- [ ] Add url param for each stage and match to allow sharing direct links to them. E.g `/#/tournament/123/stage/1/match/2`
- [ ] Remove storage from localStorage
- [ ] Bulk import players from textarea input 
- [ ] Add support to change the language of the app to Spanish
- [ ] Switch dark/light mode based on user preference 
- [ ] Improve dashboard UI and add pagination for tournaments list and filter by sport category
- [ ] Add logo for tournaments
- [ ] Add logo/photo for players

## Improvements
- [] Improve api endpoints to send only modified data to update the match score and tournament configuration instead of sending the whole tournament data.
- [ ] Improve api endpoints to update the match score and tournament configuration in real time using websockets or server-sent events. This will allow users to see the updates without refreshing the page.

Roles and permissions:
1. Admin User
2. Tournament Owner User
3. Regular User
