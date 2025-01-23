import React from 'react';
import { Container, Typography, Grid, Card, CardHeader, CardContent, List, ListItem, ListItemText, Box } from '@mui/material';

export default function AdminSettings() {
  return (
    <Container>
      <Box sx={{ py: 3 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontFamily: 'inherit',
            fontWeight: 500
          }}
        >
          Admin Settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="User Management"
              subheader="Manage user accounts and permissions"
              sx={{
                '& .MuiCardHeader-title': {
                  fontSize: '0.95rem'
                },
                '& .MuiCardHeader-subheader': {
                  fontSize: '0.8rem'
                }
              }}
            />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Active Users"
                    secondary="Currently active user accounts"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: 500
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.8rem'
                    }}
                  />
                </ListItem>
                {/* ... other list items ... */}
              </List>
            </CardContent>
          </Card>
        </Grid>
        {/* ... other grid items ... */}
      </Grid>
    </Container>
  );
} 