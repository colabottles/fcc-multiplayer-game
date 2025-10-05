class Player {
  constructor({x, y, score, id}) {
    this.x = x
    this.y = y
    this.score = score
    this.id = id
  }

  movePlayer(dir, speed) {
    if(dir == 'right') this.x = this.x + speed
    if(dir == 'left') this.x = this.x - speed
    if(dir == 'down') this.y = this.x + speed
    if(dir == 'up') this.y = this.x - speed
    
  }

  collision(item) {
    let collision_range = 10;
    let x_Range = Math.abs(this.x - item.x)
    let y_Range = Math.abs(this.y - item.y)
    if(x_Range <= collision_range &&  y_Range <= collision_range) return true

    return false

  }

  calculateRank(arr) {
    let Player1=arr[0]
    let Player2=arr[1]
    // console.log(arr)
    // Sort the player array by player.SCORE. find the position this player is.
    arr.sort(function(a, b){return b.score - a.score}); // Decending order by score
    // console.log(arr)
    let currentPlayerRank = arr.findIndex(player => {
      // console.log(`${player.id} === ${this.id}`)
      // console.log(`${player.id === this.id}`)
      return player.id === this.id
    })
    currentPlayerRank += 1;  // index 0 -> Rank 1
    // console.log(currentPlayerRank)
    // console.log(arr.length)
    
    // console.log(`Rank: ${currentPlayerRank} / ${arr.length}`)
    return `Rank: ${currentPlayerRank} / ${arr.length}`
    
  }
}

export default Player;
