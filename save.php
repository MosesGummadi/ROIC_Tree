<?php

  $permissions = array();
  foreach ($_POST['permissions'] as $key => $value) {
    if ($value == "false") {
      $permissions[$key] = false;
    } else if ($value == "true") {
      $permissions[$key] = true;
    }
  }
  $id = md5(microtime());
  $title = $_POST['title'];
  $boxes = json_decode(json_encode($_POST['boxes']));
  $permissions = json_decode(json_encode($permissions));

  $data = new stdClass();
  $data->id = $id;
  $data->boxes = $boxes;
  $data->title = $title;
  $data->permissions = $permissions;
  $content = (json_encode($data));
  file_put_contents("savedData/".$id.".json", $content);
  print_r($id);

  // $servername = "localhost";
  // $username = "test";
  // $password = "test1234";
  // $dbname = "mathCanvas";
  // $conn = new mysqli($servername, $username, $password, $dbname);
  // if ($conn->connect_error) {
  //     die("Connection failed: " . $conn->connect_error);
  // }
  // $sql = "INSERT INTO boxes (id, name, data, permissions) VALUES ('".$id."', '".$_POST['title']."', '".$boxes."', '".$permissions."')";
  // if ($conn->query($sql) === TRUE) {
  //     echo $id;
  // }
  // $conn->close();
 ?>