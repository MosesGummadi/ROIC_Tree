<?php

  print_r(file_get_contents('savedData/'.$_GET['id'].".json"));

  // $servername = "localhost";
  // $username = "test";
  // $password = "test1234";
  // $dbname = "mathCanvas";
  // $conn = new mysqli($servername, $username, $password, $dbname);
  // if ($conn->connect_error) {
  //     die("Connection failed: " . $conn->connect_error);
  // }
  // $sql = "SELECT * FROM boxes WHERE id='".$_GET['id']."'";
  // $result = $conn->query($sql);
  // if ($result->num_rows > 0) {
  //     while($row = $result->fetch_assoc()) {
  //       $row['data'] = json_decode($row['data']);
  //       $row['permissions'] = json_decode($row['permissions']);
  //       print_r(json_encode($row));
  //     }
  // } else {
  //     echo "Not Found";
  // }
  // $conn->close();
?>