# aqlen mobile app

# Contributing
## Development Workflow Overview
1. **Clone the Repository**: First, clone the repository to your local machine using `git clone git@github.ibm.com:Analytics-Cloud-Managed-Services/AWX-Security-Automation.git`.
2. **Create a Feature Branch**: Always work in a feature branch, never directly on the main branch. Create one using `git checkout -b <branch-name>`.  Always start with a fresh branch from the latest main for each new feature. This will prevent the old commits from showing up in new PRs
3. **Make Changes**: Work on your feature and make necessary changes.
4. **Commit Your Changes**: Commit your changes with `git commit -m "description of changes"`.
5. **Push to GitHub**: Push your branch to GitHub using `git push origin <branch-name>`.
6. **Create a Pull Request**: In GitHub, create a pull request (PR) from your branch to the main branch. This allows teammates to review your code.
7. **Address Review Comments**: Make any necessary changes based on feedback and commit those changes.
8. **Merge the PR**: Once approved, merge the PR. 
9. **Pull Latest main**: Finally, switch back to the main branch using `git checkout main` and pull the latest changes with `git pull`.
10. **Delete the Feature Branch Locally**: After merging, it's good to delete the old feature branch to keep things clean. Use `git branch -d <branch-name>` to delete it locally.
11. **Delete the Branch on GitHub**: Also, delete the branch on GitHub to ensure it's not reused. This can usually be done with a button in the interface after the pull request has been merged, or via the command line with `git push origin --delete <branch-name>`.

